import { avisoEquipo, confirmacionCliente } from '../../utils/correo'
import { crearPedidoCompleto, type SolicitudPedido } from '../../utils/pedido'
import { verificarNotificacion } from '../../utils/redsys'

interface PagoGuardado {
  solicitud: SolicitudPedido
  totalCentimos: number
  pedidoHoldedId?: string
}

/**
 * Notificación de Redsys: servidor a servidor, y la ÚNICA fuente fiable de que
 * algo se ha pagado. La vuelta del navegador a la URL de OK no vale, porque el
 * cliente puede cerrar la pestaña o escribir esa URL a mano.
 *
 * Aquí es donde se crea el pedido en Holded, ya cobrado.
 *
 * Redsys reintenta si no recibe un 200, así que este endpoint tiene que ser
 * idempotente: si el pedido ya se creó, se responde 200 y no se crea otro.
 */
export default defineEventHandler(async (event) => {
  const cuerpo = await readBody<Record<string, string>>(event).catch(() => ({}))

  const respuesta = verificarNotificacion(cuerpo)
  if (!respuesta) {
    // Firma mal: o es un intento de colar un pago falso, o hay un problema de
    // configuración. En ningún caso se crea nada.
    console.error('[redsys] Notificación con firma no válida. Ignorada.')
    throw createError({ statusCode: 400, statusMessage: 'Firma no válida.' })
  }

  const almacen = useStorage('pagos')
  const guardado = await almacen.getItem<PagoGuardado>(respuesta.numeroPedido)

  if (!guardado) {
    console.error(`[redsys] Pago ${respuesta.numeroPedido} sin datos guardados.`)
    // 200 igualmente: reintentar no va a hacer aparecer los datos.
    return { recibido: true }
  }

  if (!respuesta.autorizada) {
    console.warn(
      `[redsys] Pago ${respuesta.numeroPedido} rechazado (código ${respuesta.codigoRespuesta}).`,
    )
    await almacen.removeItem(respuesta.numeroPedido)
    return { recibido: true, autorizada: false }
  }

  // Ya creado en un reintento anterior: no se duplica.
  if (guardado.pedidoHoldedId) {
    return { recibido: true, autorizada: true, id: guardado.pedidoHoldedId }
  }

  // El importe cobrado tiene que ser el que se preparó. Si no cuadra, se registra
  // y NO se crea el pedido a ciegas: es mejor una llamada del equipo que un
  // documento con un importe que nadie sabe de dónde sale.
  if (respuesta.importeCentimos !== guardado.totalCentimos) {
    console.error(
      `[redsys] Importe distinto en ${respuesta.numeroPedido}: ` +
        `cobrado ${respuesta.importeCentimos}, esperado ${guardado.totalCentimos}.`,
    )
    return { recibido: true, autorizada: true, discrepancia: true }
  }

  const { id, totalCentimos, lineasCorreo } = await crearPedidoCompleto(
    { ...guardado.solicitud, referenciaPago: respuesta.codigoAutorizacion ?? undefined },
    'tarjeta',
  )

  await almacen.setItem(respuesta.numeroPedido, { ...guardado, pedidoHoldedId: id })

  const paraCorreo = {
    cliente: {
      nombre: guardado.solicitud.cliente.nombre,
      email: guardado.solicitud.cliente.email,
    },
    lineas: lineasCorreo,
    totalCentimos,
    modo: guardado.solicitud.modo,
    transporte: guardado.solicitud.transporte,
    notas: guardado.solicitud.notas,
  }
  event.waitUntil(
    Promise.allSettled([
      confirmacionCliente(paraCorreo),
      avisoEquipo({ ...paraCorreo, idPedido: id }),
    ]),
  )

  return { recibido: true, autorizada: true, id }
})
