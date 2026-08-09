/**
 * Recibe los eventos de Holded e invalida la caché del catálogo al instante.
 *
 * Es el mecanismo principal de frescura, no un extra: la v2 aplica límites de uso
 * y hacer polling constante no es viable. El cron de resync y el maxAge de 5
 * minutos son sólo la red por si un evento se pierde.
 *
 * Holded no firma los webhooks, así que la única protección es un secreto en la
 * URL. Sin él, cualquiera que descubriera el endpoint podría envenenar la caché.
 */

interface CuerpoWebhook {
  event?: string
  type?: string
}

const EVENTOS_DE_CATALOGO = new Set([
  'product.create',
  'product.update',
  'product.delete',
  'stock.update',
])

export default defineEventHandler(async (event) => {
  const { webhookSecret } = useRuntimeConfig()
  const { clave } = getQuery(event)

  if (!webhookSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Webhook no configurado.' })
  }
  if (clave !== webhookSecret) {
    throw createError({ statusCode: 401, statusMessage: 'No autorizado.' })
  }

  // Un cuerpo ilegible no debe dar 500: Holded reintentaría el evento sin necesidad.
  const cuerpo = await readBody<CuerpoWebhook>(event).catch((): CuerpoWebhook => ({}))
  const tipo = cuerpo.event ?? cuerpo.type ?? ''

  // Los eventos de contacto o factura no tocan el catálogo: no se invalida por ellos.
  if (!EVENTOS_DE_CATALOGO.has(tipo)) {
    return { recibido: true, invalidado: false, tipo }
  }

  await useStorage('cache').removeItem('nitro:functions:catalogo:v1.json')

  return { recibido: true, invalidado: true, tipo }
})
