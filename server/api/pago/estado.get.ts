/**
 * ¿Ya ha confirmado el banco este pago? Lo pregunta la pantalla de vuelta de
 * Redsys en una venta de evento, para poder enseñar el tique con su número.
 *
 * La clave es el número de pedido de Redsys, que lleva cuatro caracteres
 * aleatorios: no se puede ir probando números para ver pedidos ajenos. Y aun
 * así no se devuelve nada personal, sólo el estado y el número del tique.
 */
export default defineEventHandler(async (event) => {
  const pedido = String(getQuery(event).pedido ?? '')
  if (!/^\d{4}[a-zA-Z0-9]{0,8}$/.test(pedido)) {
    throw createError({ statusCode: 400, statusMessage: 'Pago no válido.' })
  }

  const guardado = await useStorage('pagos').getItem<{
    pedidoHoldedId?: string
    numero?: string | null
    rechazado?: boolean
  }>(pedido)

  if (!guardado) return { estado: 'desconocido' as const }
  if (guardado.rechazado) return { estado: 'rechazado' as const }
  if (guardado.pedidoHoldedId) return { estado: 'pagado' as const, numero: guardado.numero ?? null }
  return { estado: 'pendiente' as const }
})
