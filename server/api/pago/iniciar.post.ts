import { esquemaPedido } from '../pedidos.post'
import { limitarPeticiones } from '../../utils/limite'
import { prepararLineas } from '../../utils/pedido'
import { numeroPedidoRedsys, prepararPago } from '../../utils/redsys'
import { leerSesion } from '../../utils/sesion'

/**
 * Prepara un pago con tarjeta.
 *
 * El pedido **no** se crea todavía en Holded: primero se guarda aquí y sólo se
 * crea cuando el banco confirma el cobro. Al revés —crear el pedido y luego
 * mandar a pagar— dejaría pedidos fantasma de todo el que abandona el TPV.
 *
 * Y lo contrario también importa: si el cliente paga y la llamada a Holded falla,
 * el pedido guardado sigue aquí con su referencia, así que se puede recuperar.
 * Cobrar sin dejar rastro es lo único inaceptable.
 */
export default defineEventHandler(async (event) => {
  await limitarPeticiones(event, { clave: 'pago', maximo: 8, ventanaSegundos: 300 })

  const validacion = esquemaPedido.safeParse(await readBody(event))
  if (!validacion.success) {
    throw createError({ statusCode: 400, statusMessage: 'Faltan datos del pedido.' })
  }
  const datos = validacion.data

  // El importe se calcula en el servidor releyendo el catálogo. Es lo único que
  // impide que alguien pague 1 céntimo por una sudadera editando la petición.
  const { totalCentimos } = await prepararLineas(datos.lineas, datos.transporte)

  if (totalCentimos <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Este pedido no tiene importe, así que no hace falta pagarlo con tarjeta.',
    })
  }

  const sesion = await leerSesion(event)
  const config = useRuntimeConfig()

  const numeroPedido = numeroPedidoRedsys(Date.now(), crypto.randomUUID().slice(0, 4))

  await useStorage('pagos').setItem(numeroPedido, {
    solicitud: {
      ...datos,
      contactoConocido: sesion?.email === datos.cliente.email ? sesion.contactoId : null,
    },
    totalCentimos,
    creadoEn: new Date().toISOString(),
  })

  const formulario = prepararPago({
    numeroPedido,
    importeCentimos: totalCentimos,
    descripcion: `Pedido Tienda MCM (${datos.lineas.length} artículos)`,
    titular: datos.cliente.nombre,
    urlNotificacion: `${config.public.siteUrl}/api/pago/notificacion`,
    urlOk: `${config.public.siteUrl}/pago/ok?pedido=${numeroPedido}`,
    urlKo: `${config.public.siteUrl}/pago/ko`,
  })

  return formulario
})
