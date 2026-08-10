/**
 * Construcción de un pedido a partir de un carrito.
 *
 * Vive aparte del endpoint porque hay dos caminos que acaban creando el mismo
 * pedido: el checkout normal (transferencia o Bizum, el pedido se crea antes de
 * cobrar) y la notificación de Redsys (el pedido se crea cuando el banco confirma
 * que se ha pagado).
 */

import { obtenerCatalogo } from './catalogo'
import { aImporteHolded, formatearEuros } from './dinero'
import {
  aprobarPedido,
  buscarContactoPorEmail,
  crearContacto,
  crearPedido,
  type LineaPedido,
} from './holded'
import type { LineaCorreo } from './correo'

export interface LineaSolicitada {
  productoId: string
  varianteId: string | null
  cantidad: number
}

export interface DatosCliente {
  email: string
  nombre: string
  telefono?: string
  cif?: string
  direccion?: string
  poblacion?: string
  provincia?: string
  codigoPostal?: string
}

export interface SolicitudPedido {
  modo: 'b2b' | 'b2c'
  transporte: 'consolacion' | 'mensajeria'
  lineas: LineaSolicitada[]
  cliente: DatosCliente
  personaContacto?: string
  notas?: string
  /** Sólo con tarjeta: referencia de Redsys, para poder conciliar. */
  referenciaPago?: string
  /** Contacto ya conocido por la sesión, para ahorrarse la búsqueda. */
  contactoConocido?: string | null
}

export interface PedidoPreparado {
  lineas: LineaPedido[]
  lineasCorreo: LineaCorreo[]
  totalCentimos: number
}

const TEXTO_TRANSPORTE = {
  consolacion: 'Transporte Consolación (lo lleva alguien de la Familia Consolación)',
  mensajeria: 'Mensajería urgente — pendiente de presupuestar y añadir al pedido',
} as const

/**
 * Convierte el carrito en líneas de Holded.
 *
 * **Los precios se releen del catálogo, nunca se toman del navegador.** Es la
 * diferencia entre una tienda y un formulario que acepta el precio que le digan.
 */
export async function prepararLineas(
  lineasPedidas: LineaSolicitada[],
  transporte: SolicitudPedido['transporte'],
): Promise<PedidoPreparado> {
  const catalogo = await obtenerCatalogo()
  const porId = new Map(catalogo.productos.map((p) => [p.id, p]))

  const lineas: LineaPedido[] = []
  const lineasCorreo: LineaCorreo[] = []
  let totalCentimos = 0

  for (const pedida of lineasPedidas) {
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
    totalCentimos += precio * pedida.cantidad

    lineas.push({
      type: 'product',
      // La variante viaja dentro del product_id con almohadilla: es la única
      // sintaxis que Holded acepta al crear. Así resuelve además el SKU correcto.
      product_id: variante ? `${producto.id}#${variante.id}` : producto.id,
      name: producto.nombre,
      ...(variante ? { description: variante.etiqueta } : {}),
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
  if (transporte === 'consolacion') {
    lineas.push({
      type: 'service',
      name: 'Transporte Consolación',
      description: 'Sin coste. Llega cuando alguien de la Familia Consolación vaya para allá.',
      units: 1,
      price: 0,
      taxes: [],
    })
  }

  return { lineas, lineasCorreo, totalCentimos }
}

/**
 * Resuelve el contacto de Holded, creándolo si no existe.
 *
 * Se crea el contacto real en vez de usar un genérico "Cliente web": deja el CRM
 * limpio y hace que el histórico por email funcione solo, sin lógica adicional.
 */
export async function resolverContacto(
  cliente: DatosCliente,
  modo: SolicitudPedido['modo'],
  contactoConocido?: string | null,
): Promise<string> {
  if (contactoConocido) return contactoConocido

  const existente = await buscarContactoPorEmail(cliente.email)
  if (existente) return existente.id

  const creado = await crearContacto({
    name: cliente.nombre,
    email: cliente.email,
    type: 'client',
    is_person: modo === 'b2c',
    code: cliente.cif || null,
    bill_address: {
      address: cliente.direccion ?? null,
      city: cliente.poblacion ?? null,
      province: cliente.provincia ?? null,
      postal_code: cliente.codigoPostal ?? null,
      country_code: 'ES',
    },
  })
  return creado.id
}

/** Crea el pedido completo en Holded y devuelve su id y el total. */
export async function crearPedidoCompleto(
  solicitud: SolicitudPedido,
  formaDePago: 'transferencia' | 'bizum' | 'tarjeta',
): Promise<{ id: string; totalCentimos: number; lineasCorreo: LineaCorreo[] }> {
  const { lineas, lineasCorreo, totalCentimos } = await prepararLineas(
    solicitud.lineas,
    solicitud.transporte,
  )

  const contactoId = await resolverContacto(
    solicitud.cliente,
    solicitud.modo,
    solicitud.contactoConocido,
  )

  const textoPago = {
    transferencia: 'transferencia — pendiente de confirmar',
    bizum: 'Bizum ONG — pendiente de confirmar',
    tarjeta: `tarjeta — COBRADO${solicitud.referenciaPago ? ` (ref. ${solicitud.referenciaPago})` : ''}`,
  }[formaDePago]

  const notas = [
    `Pedido hecho desde la tienda web (${solicitud.modo === 'b2b' ? 'delegación' : 'particular'}).`,
    `Transporte: ${TEXTO_TRANSPORTE[solicitud.transporte]}.`,
    `Pago: ${textoPago}.`,
    solicitud.personaContacto ? `Persona de contacto: ${solicitud.personaContacto}.` : null,
    solicitud.cliente.telefono ? `Teléfono: ${solicitud.cliente.telefono}.` : null,
    solicitud.notas ? `Nota del cliente: ${solicitud.notas}` : null,
    `Total del carrito: ${formatearEuros(totalCentimos)}.`,
  ]
    .filter(Boolean)
    .join('\n')

  const pedido = await crearPedido({
    contact_id: contactoId,
    items: lineas,
    // Se etiqueta en vez de tocar sales_channel_id, que está reservado a la
    // cuenta contable por línea de producto.
    tags: ['tienda-web', solicitud.modo === 'b2b' ? 'mcmlocal' : 'particular'],
    description: `Pedido web de ${solicitud.cliente.nombre}`,
    notes: notas,
    ...(solicitud.personaContacto
      ? { custom_fields: [{ field: 'persona_contacto', value: solicitud.personaContacto }] }
      : {}),
  })

  if (useRuntimeConfig().aprobarPedidos) {
    try {
      await aprobarPedido(pedido.id)
    } catch {
      // Si falla la aprobación el pedido ya existe: el equipo puede aprobarlo a
      // mano. Tumbar aquí haría creer al cliente que su pedido no se ha hecho.
    }
  }

  return { id: pedido.id, totalCentimos, lineasCorreo }
}
