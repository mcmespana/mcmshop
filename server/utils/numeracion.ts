/**
 * Número corto de pedido para el puesto: lo que se dice en voz alta en la cola
 * ("¿el 23?") y lo que sale grande en el tique del móvil.
 *
 * No es el número de Holded: los pedidos nacen en borrador y sin número, y
 * aprobarlos sólo para numerarlos consumiría la serie oficial. Este va en la
 * descripción del pedido, así que en Holded se encuentra buscándolo.
 *
 * Con Redis compartido es correlativo por serie (un evento, o el TPV), con
 * INCR, que es atómico: dos móviles pidiendo a la vez no sacan el mismo número.
 * Sin Redis no hay forma honrada de llevar la cuenta entre instancias de Vercel,
 * así que se da un código aleatorio de cuatro caracteres: menos bonito, pero
 * nunca repetido por casualidad en un mismo día.
 */

interface ClienteRedis {
  incr(clave: string): Promise<number>
}

/** Sin 0/O ni 1/I/L: se dicta en voz alta en un sitio con ruido. */
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function codigoAleatorio(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  return [...bytes].map((b) => ALFABETO[b % ALFABETO.length]).join('')
}

export async function siguienteNumero(serie: string): Promise<string> {
  try {
    // Sólo si `contadores` está montado en Upstash (ver plugins/almacen.ts); si
    // no, getMount devuelve la memoria de esta instancia, que no sirve.
    const { driver } = useStorage().getMount('contadores')
    const redis =
      driver.name === 'upstash'
        ? (driver as { getInstance?: () => ClienteRedis }).getInstance?.()
        : undefined
    if (redis) {
      const n = await redis.incr(`mcmshop:contadores:${serie}`)
      return String(n).padStart(3, '0')
    }
  } catch (error) {
    // Que falle el contador no puede impedir apuntar una venta.
    console.error('[numeracion] No se ha podido usar el contador compartido:', error)
  }
  return codigoAleatorio()
}
