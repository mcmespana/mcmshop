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
import { EVENTOS } from '../../shared/utils/eventos'
import { esReserva, PLAZO_RESERVA } from '../../shared/utils/categorias'
import { siguienteNumero } from './numeracion'

export interface LineaSolicitada {
  productoId: string
  varianteId: string | null
  cantidad: number
}

/**
 * Cómo se paga. `efectivo` y `datafono` sólo existen en un evento presencial.
 * `pendiente` es reservar sin pagar todavía: sólo vale si el pedido lleva
 * alguna reserva, y la pantalla lo esconde un poco para que lo normal sea pagar.
 */
export type FormaDePago = 'transferencia' | 'bizum' | 'tarjeta' | 'efectivo' | 'datafono' | 'pendiente'

/**
 * Etiquetas comunes de Holded, para poder filtrar igual vengan de donde vengan:
 *
 *   origen   tienda-web · tpv
 *   evento   evento + evento-<id>
 *   pago     pago-efectivo · pago-bizum · pago-tarjeta (online, Redsys) ·
 *            pago-datafono (tarjeta en el puesto) · pago-transferencia · pago-pendiente
 *   cobro    cobrado · sin-cobrar   (sólo cuando se sabe: tarjeta, o lo marca el TPV)
 *   entrega  entregado · reservado  (sólo el TPV, que es quien lo sabe)
 *   reserva  reserva               (lleva algo que se encarga sin stock: un drop…)
 *
 * Holded quita los guiones al guardar: `pago-efectivo` aparece como `pagoefectivo`.
 */
export function etiquetaPago(forma: FormaDePago | 'pendiente'): string {
  return `pago-${forma}`
}
/** Cómo llega. `en-mano` sólo existe en un evento presencial. */
export type Transporte = 'consolacion' | 'mensajeria' | 'en-mano'

export interface DatosCliente {
  /** Obligatorio salvo en un evento presencial, donde se pide lo mínimo. */
  email?: string
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
  transporte: Transporte
  /**
   * Fecha límite deseada de entrega, sólo relevante con transporte Consolación.
   * Formato ISO "AAAA-MM-DD". Ausente o vacío = sin fecha concreta.
   */
  fechaLimite?: string
  lineas: LineaSolicitada[]
  cliente: DatosCliente
  personaContacto?: string
  notas?: string
  /** Sólo con tarjeta: referencia de Redsys, para poder conciliar. */
  referenciaPago?: string
  /** Contacto ya conocido por la sesión, para ahorrarse la búsqueda. */
  contactoConocido?: string | null
  /** Id del evento presencial en que se ha hecho. Se comprueba que esté activo al recibirlo. */
  evento?: string
}

export interface PedidoPreparado {
  lineas: LineaPedido[]
  lineasCorreo: LineaCorreo[]
  totalCentimos: number
  /** Si alguna línea es una reserva: se pide sin stock y se encarga aparte. */
  hayReserva: boolean
}

const TEXTO_TRANSPORTE = {
  consolacion: 'Transporte Consolación (lo lleva alguien de la Familia Consolación)',
  mensajeria: 'Mensajería urgente — pendiente de presupuestar y añadir al pedido',
  'en-mano': 'Entregado en mano en el puesto del evento',
} as const

function formatearFecha(iso: string): string {
  const fecha = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(fecha.getTime())) return iso
  return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Convierte el carrito en líneas de Holded.
 *
 * **Los precios se releen del catálogo, nunca se toman del navegador.** Es la
 * diferencia entre una tienda y un formulario que acepta el precio que le digan.
 */
export async function prepararLineas(
  lineasPedidas: LineaSolicitada[],
  transporte: SolicitudPedido['transporte'],
  /** Pedido online (no del puesto ni del TPV): lo reservable se pide siempre como reserva. */
  soloReserva = false,
): Promise<PedidoPreparado> {
  const catalogo = await obtenerCatalogo()
  const porId = new Map(catalogo.productos.map((p) => [p.id, p]))

  const lineas: LineaPedido[] = []
  const lineasCorreo: LineaCorreo[] = []
  let totalCentimos = 0
  let hayReserva = false

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

    // Se decide aquí, con el stock de ahora, y no con lo que diga el navegador:
    // si entre medias ha llegado stock, ya no es reserva y se puede mandar.
    const reserva = esReserva(producto, variante?.stock ?? producto.stock, soloReserva)
    if (reserva) hayReserva = true
    // En la línea, para que al encargar se vea de un vistazo qué hay que pedir.
    const descripcion = [reserva ? 'RESERVA' : null, variante?.etiqueta ?? null]
      .filter(Boolean)
      .join(' · ')

    lineas.push({
      type: 'product',
      // La variante viaja dentro del product_id con almohadilla: es la única
      // sintaxis que Holded acepta al crear. Así resuelve además el SKU correcto.
      product_id: variante ? `${producto.id}#${variante.id}` : producto.id,
      name: producto.nombre,
      ...(descripcion ? { description: descripcion } : {}),
      units: pedida.cantidad,
      price: Number(aImporteHolded(precio)),
      taxes: [],
    })

    lineasCorreo.push({
      nombre: producto.nombre,
      variante: variante?.etiqueta ?? null,
      cantidad: pedida.cantidad,
      precioCentimos: precio,
      reserva,
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

  return { lineas, lineasCorreo, totalCentimos, hayReserva }
}

/**
 * Reglas de las reservas que dependen del catálogo, y por eso no caben en la
 * validación del formulario:
 *
 *  - Reservar sin pagar es una puerta para casos concretos, no un método más:
 *    sin nada reservado en el carrito no se acepta.
 *  - En un puesto no se pide correo, pero lo reservado no se lleva hoy: hace
 *    falta un correo o un teléfono para avisar cuando llegue.
 */
export function comprobarReserva(
  hayReserva: boolean,
  solicitud: Pick<SolicitudPedido, 'evento' | 'cliente'>,
  formaDePago: FormaDePago,
): void {
  if (formaDePago === 'pendiente' && !hayReserva) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Lo que hay en el carrito ya no es una reserva. Elige cómo pagarlo.',
    })
  }
  if (hayReserva && solicitud.evento && !solicitud.cliente.email && !solicitud.cliente.telefono) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Déjanos un correo o un teléfono para avisarte cuando llegue tu reserva.',
    })
  }
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

  // Sin correo (venta en un puesto) no hay con qué buscarlo: se crea con el
  // nombre, que es lo que hay. Duplica si la misma persona vuelve a comprar, y
  // es el precio de no pedirle datos a nadie en la cola.
  if (cliente.email) {
    const existente = await buscarContactoPorEmail(cliente.email)
    if (existente) return existente.id
  }

  const creado = await crearContacto({
    name: cliente.nombre,
    ...(cliente.email ? { email: cliente.email } : {}),
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
  formaDePago: FormaDePago,
): Promise<{
  id: string
  totalCentimos: number
  lineasCorreo: LineaCorreo[]
  /** Número corto para el tique del puesto. Sólo en ventas de evento. */
  numero: string | null
  hayReserva: boolean
}> {
  const { lineas, lineasCorreo, totalCentimos, hayReserva } = await prepararLineas(
    solicitud.lineas,
    solicitud.transporte,
    !solicitud.evento,
  )

  // Con tarjeta ya se comprobó antes de mandar al banco (pago/iniciar): aquí el
  // cobro está hecho y tumbar el pedido sería cobrar sin dejar rastro.
  if (formaDePago !== 'tarjeta') comprobarReserva(hayReserva, solicitud, formaDePago)

  const contactoId = await resolverContacto(
    solicitud.cliente,
    solicitud.modo,
    solicitud.contactoConocido,
  )

  // Por id y no por fechas: la validación de entrada ya exigió que estuviera
  // activo, y un pago con tarjeta de las 23:59 del último día se notifica (y llega
  // aquí) pasada la medianoche.
  const evento = EVENTOS.find((e) => e.id === solicitud.evento) ?? null
  const numero = evento ? await siguienteNumero(evento.id) : null

  const textoPago = {
    transferencia: 'transferencia — pendiente de confirmar',
    bizum: evento ? 'Bizum ONG en el puesto — comprobar' : 'Bizum ONG — pendiente de confirmar',
    efectivo: 'efectivo en el puesto — comprobar la caja',
    datafono: 'tarjeta con el datáfono del puesto — comprobar el cobro',
    tarjeta: `tarjeta — COBRADO${solicitud.referenciaPago ? ` (ref. ${solicitud.referenciaPago})` : ''}`,
    pendiente: 'SIN PAGAR — reserva hecha sin pagar, hay que cobrarla',
  }[formaDePago]

  const notas = [
    evento
      ? `Venta en el evento «${evento.nombre}», tique nº ${numero}, hecha por la persona desde su móvil.`
      : `Pedido hecho desde la tienda web (${solicitud.modo === 'b2b' ? 'MCM Local' : 'particular'}).`,
    `Transporte: ${TEXTO_TRANSPORTE[solicitud.transporte]}.`,
    solicitud.transporte === 'consolacion'
      ? solicitud.fechaLimite
        ? `Fecha límite deseada: ${formatearFecha(solicitud.fechaLimite)}.`
        : 'Sin fecha límite concreta para la entrega.'
      : null,
    `Pago: ${textoPago}.`,
    hayReserva
      ? `RESERVA: las líneas marcadas «RESERVA» se encargan aparte. Avisar al cliente cuando lleguen (${PLAZO_RESERVA}).`
      : null,
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
    tags: [
      'tienda-web',
      solicitud.modo === 'b2b' ? 'mcmlocal' : 'particular',
      // Holded quita los guiones: `evento-pascua-27` se guarda `eventopascua27`.
      ...(evento ? ['evento', `evento-${evento.id}`] : []),
      etiquetaPago(formaDePago),
      ...(formaDePago === 'tarjeta' ? ['cobrado'] : []),
      ...(hayReserva ? ['reserva'] : []),
    ],
    description: evento
      ? `${evento.nombre} · nº ${numero} · ${solicitud.cliente.nombre}`
      : `Pedido web de ${solicitud.cliente.nombre}`,
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

  return { id: pedido.id, totalCentimos, lineasCorreo, numero, hayReserva }
}
