import { z } from 'zod'
import { obtenerCatalogo } from '../utils/catalogo'
import { avisoEquipo, confirmacionCliente, type LineaCorreo } from '../utils/correo'
import { limitarPeticiones } from '../utils/limite'
import { aImporteHolded, formatearEuros } from '../utils/dinero'
import {
  aprobarPedido,
  buscarContactoPorEmail,
  crearContacto,
  crearPedido,
  type LineaPedido,
} from '../utils/holded'
import { leerSesion } from '../utils/sesion'

const esquema = z.object({
  /** Identificador que genera el navegador para que un reintento no duplique el pedido. */
  claveIdempotencia: z.string().min(8).max(100),
  modo: z.enum(['b2b', 'b2c']),
  transporte: z.enum(['consolacion', 'mensajeria']),
  lineas: z
    .array(
      z.object({
        productoId: z.string().min(1),
        varianteId: z.string().min(1).nullable(),
        cantidad: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(60),
  cliente: z.object({
    email: z.email(),
    nombre: z.string().min(2).max(120),
    telefono: z.string().max(40).optional(),
    cif: z.string().max(20).optional(),
    direccion: z.string().max(200).optional(),
    poblacion: z.string().max(120).optional(),
    provincia: z.string().max(120).optional(),
    codigoPostal: z.string().max(12).optional(),
  }),
  /** Persona concreta que hace el pedido dentro de la delegación. */
  personaContacto: z.string().max(120).optional(),
  notas: z.string().max(1000).optional(),
})

const TEXTO_TRANSPORTE = {
  consolacion: 'Transporte Consolación (lo lleva alguien de la Familia Consolación)',
  mensajeria: 'Mensajería urgente — pendiente de presupuestar y añadir al pedido',
} as const

export default defineEventHandler(async (event) => {
  // Un pedido cada pocos minutos por IP es de sobra para el volumen real y evita
  // que el formulario público se convierta en una manguera hacia el ERP.
  await limitarPeticiones(event, { clave: 'pedidos', maximo: 5, ventanaSegundos: 300 })

  // Un cuerpo mal formado es culpa de quien llama: 400, no 500. Y sin devolver el
  // detalle de zod, que sólo sirve para que el cliente vea nombres de campos internos.
  const validacion = esquema.safeParse(await readBody(event))
  if (!validacion.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Faltan datos del pedido o el carrito está vacío. Revisa el formulario.',
    })
  }
  const datos = validacion.data

  const almacen = useStorage('pedidos')

  // Un reintento tras un timeout no puede crear un segundo pedido en Holded.
  const yaHecho = await almacen.getItem<{ id: string }>(datos.claveIdempotencia)
  if (yaHecho) return { id: yaHecho.id, repetido: true }

  // Los precios NUNCA se toman del navegador: se releen del catálogo.
  const catalogo = await obtenerCatalogo()
  const porId = new Map(catalogo.productos.map((p) => [p.id, p]))

  const lineas: LineaPedido[] = []
  const lineasCorreo: LineaCorreo[] = []
  let total = 0

  for (const pedida of datos.lineas) {
    const producto = porId.get(pedida.productoId)
    if (!producto) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Un producto de tu pedido ya no está disponible. Revisa el carrito.',
      })
    }

    const variante = pedida.varianteId
      ? producto.variantes.find((v) => v.id === pedida.varianteId)
      : null

    if (pedida.varianteId && !variante) {
      throw createError({
        statusCode: 409,
        statusMessage: `La opción elegida de "${producto.nombre}" ya no existe. Revisa el carrito.`,
      })
    }

    const precio = variante?.precioCentimos ?? producto.precioCentimos
    total += precio * pedida.cantidad

    lineas.push({
      type: 'product',
      product_id: producto.id,
      // Se envía aunque esté comprobado que Holded lo ignora al crear, por si algún
      // día lo admite. Lo que de verdad identifica la variante es `description`.
      ...(variante ? { variant_id: variante.id } : {}),
      name: producto.nombre,
      // Único sitio donde sobrevive la variante: Holded descarta variant_id y pisa
      // el sku de la línea con el del producto padre. Va la etiqueta legible y,
      // detrás, el SKU real de la variante para que el equipo pueda buscarlo.
      ...(variante
        ? { description: [variante.etiqueta, variante.sku].filter(Boolean).join(' · ') }
        : {}),
      units: pedida.cantidad,
      price: Number(aImporteHolded(precio)),
      taxes: [],
    })

    lineasCorreo.push({
      nombre: producto.nombre,
      variante: variante?.etiqueta ?? null,
      cantidad: pedida.cantidad,
      precioCentimos: precio,
    })
  }

  // El transporte urgente no lleva línea: no se sabe el precio y no se inventa.
  // Cuando el equipo lo sepa, añade la línea en Holded, que es lo que ya hace hoy.
  if (datos.transporte === 'consolacion') {
    lineas.push({
      type: 'service',
      name: 'Transporte Consolación',
      description: 'Sin coste. Llega cuando alguien de la Familia Consolación vaya para allá.',
      units: 1,
      price: 0,
      taxes: [],
    })
  }

  // ── Resolución de contacto ────────────────────────────────────────────────
  // create_sales_order exige un contact_id existente, así que hay que resolverlo
  // o crearlo. Se crea el contacto real en vez de usar un genérico "Cliente web":
  // deja el CRM limpio y hace que el histórico por email funcione solo.
  const sesion = await leerSesion(event)
  let contactoId = sesion?.email === datos.cliente.email ? sesion.contactoId : null

  if (!contactoId) {
    const existente = await buscarContactoPorEmail(datos.cliente.email)
    contactoId = existente?.id ?? null
  }

  if (!contactoId) {
    const creado = await crearContacto({
      name: datos.cliente.nombre,
      email: datos.cliente.email,
      type: 'client',
      is_person: datos.modo === 'b2c',
      code: datos.cliente.cif || null,
      bill_address: {
        address: datos.cliente.direccion ?? null,
        city: datos.cliente.poblacion ?? null,
        province: datos.cliente.provincia ?? null,
        postal_code: datos.cliente.codigoPostal ?? null,
        country_code: 'ES',
      },
    })
    contactoId = creado.id
  }

  const notas = [
    `Pedido hecho desde la tienda web (${datos.modo === 'b2b' ? 'delegación' : 'particular'}).`,
    `Transporte: ${TEXTO_TRANSPORTE[datos.transporte]}.`,
    `Pago: ${datos.modo === 'b2b' ? 'transferencia' : 'Bizum ONG'} — pendiente de confirmar.`,
    datos.personaContacto ? `Persona de contacto: ${datos.personaContacto}.` : null,
    datos.cliente.telefono ? `Teléfono: ${datos.cliente.telefono}.` : null,
    datos.notas ? `Nota del cliente: ${datos.notas}` : null,
    `Total del carrito: ${formatearEuros(total)}.`,
  ]
    .filter(Boolean)
    .join('\n')

  const pedido = await crearPedido({
    contact_id: contactoId,
    items: lineas,
    // Se etiqueta en vez de tocar sales_channel_id, que está reservado a la
    // cuenta contable por línea de producto.
    tags: ['tienda-web', datos.modo === 'b2b' ? 'mcmlocal' : 'particular'],
    description: `Pedido web de ${datos.cliente.nombre}`,
    notes: notas,
    ...(datos.personaContacto
      ? { custom_fields: [{ field: 'persona_contacto', value: datos.personaContacto }] }
      : {}),
  })

  // El pedido nace en borrador y sin número. Aprobarlo le asigna número de serie
  // y lo deja igual que los que hace el equipo a mano, pero consume numeración,
  // así que por defecto se deja en borrador para que alguien lo revise antes.
  if (useRuntimeConfig().aprobarPedidos) {
    try {
      await aprobarPedido(pedido.id)
    } catch {
      // Si falla la aprobación el pedido ya existe: no se pierde nada y el equipo
      // puede aprobarlo a mano. Tumbar aquí haría creer al cliente que no se hizo.
    }
  }

  await almacen.setItem(datos.claveIdempotencia, { id: pedido.id })

  // Los correos van después de guardar la idempotencia y sin await bloqueante:
  // el pedido ya existe y un fallo de Resend no puede convertirse en un error
  // que empuje al cliente a reintentar.
  const paraCorreo = {
    cliente: { nombre: datos.cliente.nombre, email: datos.cliente.email },
    lineas: lineasCorreo,
    totalCentimos: total,
    modo: datos.modo,
    transporte: datos.transporte,
    notas: datos.notas,
  }
  event.waitUntil(
    Promise.allSettled([
      confirmacionCliente(paraCorreo),
      avisoEquipo({ ...paraCorreo, idPedido: pedido.id }),
    ]),
  )

  return { id: pedido.id, repetido: false, totalCentimos: total }
})
