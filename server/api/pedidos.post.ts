import { z } from 'zod'
import { avisoEquipo, confirmacionCliente } from '../utils/correo'
import { limitarPeticiones } from '../utils/limite'
import { crearPedidoCompleto } from '../utils/pedido'
import { leerSesion } from '../utils/sesion'
import { eventoActivo } from '../../shared/utils/eventos'

const esquemaBase = z.object({
  /** Identificador que genera el navegador para que un reintento no duplique el pedido. */
  claveIdempotencia: z.string().min(8).max(100),
  modo: z.enum(['b2b', 'b2c']),
  /**
   * Sólo transferencia y bizum: pagar con tarjeta va por /api/pago/iniciar, que
   * comparte este esquema pero nunca llega a crear el pedido con él — lo crea
   * la notificación de Redsys, una vez que el banco confirma el cobro.
   */
  formaDePago: z.enum(['transferencia', 'bizum', 'efectivo']).optional(),
  transporte: z.enum(['consolacion', 'mensajeria', 'en-mano']),
  /** Id del evento presencial, si el pedido se hace en un puesto. */
  evento: z.string().max(60).optional(),
  /** Fecha límite deseada, sólo con transporte Consolación. Vacío = sin fecha concreta. */
  fechaLimite: z.string().optional(),
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
    email: z.email().optional(),
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

/**
 * Las reglas del modo evento, en el servidor y no sólo en la pantalla: el
 * formulario es público y cualquiera puede mandar lo que quiera.
 *
 *  - Fuera de un evento activo: correo obligatorio, y ni efectivo ni entrega en
 *    mano (nadie va a estar en un puesto para cobrarlo ni para darlo).
 *  - Dentro: correo opcional, y la entrega es siempre en mano.
 */
export const esquemaPedido = esquemaBase.superRefine((datos, ctx) => {
  const evento = eventoActivo(datos.evento)
  if (datos.evento && !evento) {
    ctx.addIssue({ code: 'custom', message: 'evento-cerrado', path: ['evento'] })
    return
  }
  if (evento) {
    if (datos.transporte !== 'en-mano') {
      ctx.addIssue({ code: 'custom', message: 'en-mano', path: ['transporte'] })
    }
    return
  }
  if (!datos.cliente.email) ctx.addIssue({ code: 'custom', message: 'email', path: ['cliente'] })
  if (datos.formaDePago === 'efectivo' || datos.transporte === 'en-mano') {
    ctx.addIssue({ code: 'custom', message: 'solo-evento', path: ['formaDePago'] })
  }
})

/** Mensaje para quien abrió la tienda en modo evento y el evento ya terminó. */
export const MENSAJE_EVENTO_CERRADO =
  'El evento ya ha terminado, así que no se puede pagar en el puesto. Recarga la página para pedir online.'

export function errorDeValidacion(error: z.ZodError): never {
  const cerrado = error.issues.some((i) => i.message === 'evento-cerrado')
  throw createError({
    statusCode: 400,
    statusMessage: cerrado
      ? MENSAJE_EVENTO_CERRADO
      : 'Faltan datos del pedido o el carrito está vacío. Revisa el formulario.',
  })
}

export default defineEventHandler(async (event) => {
  // Un cuerpo mal formado es culpa de quien llama: 400, no 500. Y sin devolver el
  // detalle de zod, que sólo sirve para exponer nombres de campos internos.
  const validacion = esquemaPedido.safeParse(await readBody(event))
  if (!validacion.success) errorDeValidacion(validacion.error)
  const datos = validacion.data

  // Un pedido cada pocos minutos por IP es de sobra para el volumen real y evita
  // que el formulario público se convierta en una manguera hacia el ERP.
  //
  // Menos en un evento: la tablet del puesto, o todos los móviles en la misma
  // wifi, salen por la misma IP, y con cinco pedidos se quedaría la cola parada.
  // Sólo vale mientras el evento está en fechas, así que el agujero dura días.
  await limitarPeticiones(
    event,
    eventoActivo(datos.evento)
      ? { clave: 'pedidos-evento', maximo: 60, ventanaSegundos: 300 }
      : { clave: 'pedidos', maximo: 5, ventanaSegundos: 300 },
  )

  // Este endpoint sólo crea pedidos ya decididos por transferencia o Bizum: si
  // llega sin forma de pago (o con "tarjeta", que no es una opción válida aquí),
  // es que algo en el cliente se ha saltado el paso, y no se adivina qué poner.
  if (!datos.formaDePago) {
    throw createError({ statusCode: 400, statusMessage: 'Falta indicar cómo se va a pagar.' })
  }

  const almacen = useStorage('pedidos')

  // Un reintento tras un timeout no puede crear un segundo pedido en Holded.
  const yaHecho = await almacen.getItem<{ id: string; numero?: string | null }>(
    datos.claveIdempotencia,
  )
  if (yaHecho) return { id: yaHecho.id, numero: yaHecho.numero ?? null, repetido: true }

  const sesion = await leerSesion(event)

  const { id, totalCentimos, lineasCorreo, numero } = await crearPedidoCompleto(
    {
      ...datos,
      contactoConocido:
        datos.cliente.email && sesion?.email === datos.cliente.email ? sesion.contactoId : null,
    },
    datos.formaDePago,
  )

  await almacen.setItem(datos.claveIdempotencia, { id, numero })

  // Los correos van después de guardar la idempotencia y sin bloquear: el pedido
  // ya existe y un fallo de Resend no puede convertirse en un error que empuje al
  // cliente a reintentar.
  const paraCorreo = {
    cliente: { nombre: datos.cliente.nombre, email: datos.cliente.email },
    lineas: lineasCorreo,
    totalCentimos,
    modo: datos.modo,
    formaDePago: datos.formaDePago,
    transporte: datos.transporte,
    notas: datos.notas,
    evento: eventoActivo(datos.evento)?.nombre,
  }
  event.waitUntil(
    Promise.allSettled([
      confirmacionCliente(paraCorreo),
      avisoEquipo({ ...paraCorreo, idPedido: id }),
    ]),
  )

  return { id, numero, repetido: false, totalCentimos }
})
