import upstash from 'unstorage/drivers/upstash'

/**
 * Almacén compartido (Redis de Upstash) para lo que NO puede vivir en memoria.
 *
 * En Vercel cada petición puede caer en una instancia distinta, y la memoria de
 * una instancia no la ve ninguna otra. Con el almacén por defecto pasaba esto:
 *
 *   1. `/api/pago/iniciar` guarda el carrito en la instancia A.
 *   2. Redsys cobra y avisa a `/api/pago/notificacion`, que cae en la B.
 *   3. La B no encuentra el carrito: **el cliente ha pagado y no hay pedido.**
 *
 * Lo mismo con la idempotencia de pedidos (un reintento podía duplicar) y con el
 * límite por IP (cada instancia llevaba su propia cuenta).
 *
 * Se monta en tiempo de ejecución y sólo si hay credenciales, para que en local
 * todo siga funcionando en memoria sin configurar nada. Acepta los nombres de
 * variable de la integración de Upstash en el Marketplace de Vercel
 * (`KV_REST_API_*`) y los de Upstash a pelo (`UPSTASH_REDIS_REST_*`).
 */
export default defineNitroPlugin(() => {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

  if (!url || !token) {
    if (process.env.VERCEL) {
      console.error(
        '[almacen] Sin Redis compartido: los pagos con tarjeta pueden quedarse sin pedido. ' +
          'Conecta Upstash Redis al proyecto en Vercel (ver PUESTA_EN_MARCHA.md).',
      )
    }
    return
  }

  const almacen = useStorage()
  // Caducidades: un pago a medias no se recupera pasado un día; la idempotencia y
  // los límites son de minutos. Sin TTL, Redis acumularía basura para siempre.
  const DIA = 60 * 60 * 24
  almacen.mount('pagos', upstash({ url, token, base: 'mcmshop:pagos', ttl: 30 * DIA }))
  almacen.mount('pedidos', upstash({ url, token, base: 'mcmshop:pedidos', ttl: DIA }))
  almacen.mount('limites', upstash({ url, token, base: 'mcmshop:limites', ttl: 60 * 60 }))
  // Los contadores de número de pedido no caducan: un número repetido en el mismo
  // evento es justo lo que no puede pasar en la cola de un puesto.
  almacen.mount('contadores', upstash({ url, token, base: 'mcmshop:contadores' }))
})
