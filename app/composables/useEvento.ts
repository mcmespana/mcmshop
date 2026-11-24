import type { Evento } from '~~/shared/utils/eventos'

/**
 * ¿Está esta persona comprando en un puesto presencial?
 *
 * Se entra desde la tarjeta destacada de la bienvenida, o por el enlace
 * `/evento/<id>` (un QR en el puesto). Queda en una cookie, pero la cookie sola
 * no basta: el evento además tiene que estar publicado hoy, así que al acabar
 * se apaga solo, sin que nadie toque nada.
 */
export function useEvento() {
  const cookie = useCookie<string | null>('mcm_evento', {
    default: () => null,
    // Lo que dura un evento largo con su semana de antes; las fechas mandan igual.
    maxAge: 60 * 60 * 24 * 21,
    sameSite: 'lax',
  })

  const idActivo = useState<string | null>('evento', () => cookie.value)

  const evento = computed<Evento | null>(() => eventoActivo(idActivo.value))

  function activar(id: string) {
    idActivo.value = id
    cookie.value = id
  }

  /** Vuelve a la tienda normal en este dispositivo. */
  function salir() {
    idActivo.value = null
    cookie.value = null
  }

  return { evento, activar, salir }
}
