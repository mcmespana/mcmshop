import type { Modo } from '~~/server/utils/catalogo'

export type { Modo }

/**
 * B2B (delegación) o B2C (particular).
 *
 * El dominio del correo NO sirve para deducirlo: hay personas con correo
 * @movimientoconsolacion.com. Así que lo elige el usuario. Si entra con Google y su
 * contacto lleva el tag `mcmlocal` en Holded, se le propone B2B por defecto, pero
 * puede cambiarlo: alguien de una delegación también hace pedidos personales.
 *
 * Se distingue "no ha elegido todavía" de "ha elegido particular", porque son cosas
 * distintas: al primero hay que explicarle la diferencia una vez, al segundo no.
 * Aun así nunca se bloquea la entrada al catálogo con una pantalla previa.
 */
export function useModo() {
  const cookie = useCookie<Modo>('mcm_modo', {
    default: () => 'b2c',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  const cookieElegido = useCookie<'1' | null>('mcm_modo_elegido', {
    default: () => null,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  const modo = useState<Modo>('modo', () => cookie.value)
  const haElegido = useState<boolean>('modo-elegido', () => cookieElegido.value === '1')

  watch(modo, (nuevo) => {
    cookie.value = nuevo
  })

  /** Elección explícita de la persona: deja de preguntársele. */
  function cambiar(nuevo: Modo) {
    modo.value = nuevo
    haElegido.value = true
    cookieElegido.value = '1'
  }

  /** Propuesta del sistema (p. ej. su contacto es delegación): no cuenta como elección. */
  function proponer(nuevo: Modo) {
    if (haElegido.value) return
    modo.value = nuevo
  }

  /** Cierra el aviso sin cambiar nada: quien lo ignora se queda en particular. */
  function descartarAviso() {
    haElegido.value = true
    cookieElegido.value = '1'
  }

  const esDelegacion = computed(() => modo.value === 'b2b')

  return { modo, cambiar, proponer, descartarAviso, haElegido, esDelegacion }
}
