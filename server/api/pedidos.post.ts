import { z } from 'zod'
import { avisoEquipo, confirmacionCliente } from '../utils/correo'
import { limitarPeticiones } from '../utils/limite'
import { crearPedidoCompleto } from '../utils/pedido'
import { leerSesion } from '../utils/sesion'

export const esquemaPedido = z.object({
  /** Identificador que genera el navegador para que un reintento no duplique el pedido. */
  claveIdempotencia: z.string().min(8).max(100),
  modo: z.enum(['b2b', 'b2c']),
  /**
   * Sólo transferencia y bizum: pagar con tarjeta va por /api/pago/iniciar, que
   * comparte este esquema pero nunca llega a crear el pedido con él — lo crea
   * la notificación de Redsys, una vez que el banco confirma el cobro.
   */
  formaDePago: z.enum(['transferencia', 'bizum']).optional(),
  transporte: z.enum(['consolacion', 'mensajeria']),
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

export default defineEventHandler(async (event) => {
  // Un pedido cada pocos minutos por IP es de sobra para el volumen real y evita
  // que el formulario público se convierta en una manguera hacia el ERP.
  await limitarPeticiones(event, { clave: 'pedidos', maximo: 5, ventanaSegundos: 300 })

  // Un cuerpo mal formado es culpa de quien llama: 400, no 500. Y sin devolver el
  // detalle de zod, que sólo sirve para exponer nombres de campos internos.
  const validacion = esquemaPedido.safeParse(await readBody(event))
  if (!validacion.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Faltan datos del pedido o el carrito está vacío. Revisa el formulario.',
    })
  }
  const datos = validacion.data

  // Este endpoint sólo crea pedidos ya decididos por transferencia o Bizum: si
  // llega sin forma de pago (o con "tarjeta", que no es una opción válida aquí),
  // es que algo en el cliente se ha saltado el paso, y no se adivina qué poner.
  if (!datos.formaDePago) {
    throw createError({ statusCode: 400, statusMessage: 'Falta indicar cómo se va a pagar.' })
  }

  const almacen = useStorage('pedidos')

  // Un reintento tras un timeout no puede crear un segundo pedido en Holded.
  const yaHecho = await almacen.getItem<{ id: string }>(datos.claveIdempotencia)
  if (yaHecho) return { id: yaHecho.id, repetido: true }

  const sesion = await leerSesion(event)

  const { id, totalCentimos, lineasCorreo } = await crearPedidoCompleto(
    {
      ...datos,
      contactoConocido: sesion?.email === datos.cliente.email ? sesion.contactoId : null,
    },
    datos.formaDePago,
  )

  await almacen.setItem(datos.claveIdempotencia, { id })

  // Los correos van después de guardar la idempotencia y sin bloquear: el pedido
  // ya existe y un fallo de Resend no puede convertirse en un error que empuje al
  // cliente a reintentar.
  const paraCorreo = {
    cliente: { nombre: datos.cliente.nombre, email: datos.cliente.email },
    lineas: lineasCorreo,
    totalCentimos,
    modo: datos.modo,
    transporte: datos.transporte,
    notas: datos.notas,
  }
  event.waitUntil(
    Promise.allSettled([
      confirmacionCliente(paraCorreo),
      avisoEquipo({ ...paraCorreo, idPedido: id }),
    ]),
  )

  return { id, repetido: false, totalCentimos }
})
