import type { Modo } from '~~/server/utils/catalogo'

export type { Modo }

export interface Delegacion {
  id: string
  nombre: string
  /** Sólo se conocen tras pedir la ficha completa en la bienvenida. */
  email?: string | null
  direccion?: {
    address: string | null
    city: string | null
    province: string | null
    postal_code: string | null
  } | null
}

/**
 * B2B (delegación) o B2C (particular), y qué delegación en concreto.
 *
 * El dominio del correo NO sirve para deducirlo: hay personas con correo
 * @movimientoconsolacion.com. Lo elige la persona en la pantalla de bienvenida.
 *
 * Nadie verifica que quien dice ser MCM Castellón lo sea: es una decisión
 * consciente. Quien quiera ver su histórico tendrá que entrar con Google, y un
 * pedido falso lo borra el equipo en Holded. Poner un muro delante habría frenado
 * a las 10 delegaciones reales para protegerse de un problema que no existe.
 */
export function useModo() {
  const cookieModo = useCookie<Modo>('mcm_modo', {
    default: () => 'b2c',
    maxAge: 60 * 60 * 24 * 400,
    sameSite: 'lax',
  })

  const cookieDelegacion = useCookie<Delegacion | null>('mcm_delegacion', {
    default: () => null,
    maxAge: 60 * 60 * 24 * 400,
    sameSite: 'lax',
  })

  const cookieElegido = useCookie<'1' | null>('mcm_modo_elegido', {
    default: () => null,
    maxAge: 60 * 60 * 24 * 400,
    sameSite: 'lax',
  })

  const modo = useState<Modo>('modo', () => cookieModo.value)
  const delegacion = useState<Delegacion | null>('delegacion', () => cookieDelegacion.value)
  const haElegido = useState<boolean>('modo-elegido', () => cookieElegido.value === '1')

  watch(modo, (v) => {
    cookieModo.value = v
  })
  watch(delegacion, (v) => {
    cookieDelegacion.value = v
  })

  /** Entra como delegación concreta. */
  function elegirDelegacion(elegida: Delegacion) {
    modo.value = 'b2b'
    delegacion.value = elegida
    haElegido.value = true
    cookieElegido.value = '1'
  }

  /** Entra como persona: monitor o miembro del MCM. */
  function elegirPersonal() {
    modo.value = 'b2c'
    delegacion.value = null
    haElegido.value = true
    cookieElegido.value = '1'
  }

  /** Propuesta del sistema (su contacto lleva el tag `mcmlocal`): no es una elección. */
  function proponer(nuevo: Modo) {
    if (haElegido.value) return
    modo.value = nuevo
  }

  const esDelegacion = computed(() => modo.value === 'b2b')

  /** Cómo llamar a quien está comprando ahora mismo. */
  const nombreModo = computed(() =>
    modo.value === 'b2b' ? (delegacion.value?.nombre ?? 'MCM Local') : 'Pedido personal',
  )

  return {
    modo,
    delegacion,
    haElegido,
    esDelegacion,
    nombreModo,
    elegirDelegacion,
    elegirPersonal,
    proponer,
  }
}
