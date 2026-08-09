import type { Modo } from '~~/server/utils/catalogo'

export type { Modo }

/**
 * B2B (delegación) o B2C (particular).
 *
 * El dominio del correo NO sirve para deducirlo: hay personas con correo
 * @movimientoconsolacion.com. Así que lo elige el usuario. Si entra con Google y su
 * contacto lleva el tag `mcmlocal` en Holded, se le propone B2B por defecto, pero
 * puede cambiarlo: alguien de una delegación también hace pedidos personales.
 */
export function useModo() {
  const cookie = useCookie<Modo>('mcm_modo', {
    default: () => 'b2c',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  const modo = useState<Modo>('modo', () => cookie.value)

  watch(modo, (nuevo) => {
    cookie.value = nuevo
  })

  function cambiar(nuevo: Modo) {
    modo.value = nuevo
  }

  const esDelegacion = computed(() => modo.value === 'b2b')

  return { modo, cambiar, esDelegacion }
}
