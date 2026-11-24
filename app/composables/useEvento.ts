import type { Evento } from '~~/shared/utils/eventos'

/**
 * ¿Estamos vendiendo en un puesto presencial?
 *
 * Se entra por el enlace `/evento/<id>` (o un QR con él), que deja una cookie en
 * ese móvil o tablet. La cookie sola no basta: el evento además tiene que estar
 * hoy en fechas, así que al acabar se apaga solo, sin que nadie toque nada.
 *
 * Los eventos con `paraTodos` se aplican a cualquiera que entre esos días, haya
 * pasado por el enlace o no, salvo que haya pulsado "Salir".
 */
export function useEvento() {
  const cookie = useCookie<string | null>('mcm_evento', {
    default: () => null,
    // Basta con que dure lo que dura un evento largo; las fechas mandan igual.
    maxAge: 60 * 60 * 24 * 14,
    sameSite: 'lax',
  })

  const idActivo = useState<string | null>('evento', () => cookie.value)

  const evento = computed<Evento | null>(() => {
    if (idActivo.value === 'fuera') return null
    return eventoActivo(idActivo.value) ?? eventoParaTodos()
  })

  function activar(id: string) {
    idActivo.value = id
    cookie.value = id
  }

  /** Vuelve a la tienda normal en este dispositivo, también si el evento es para todos. */
  function salir() {
    idActivo.value = 'fuera'
    cookie.value = 'fuera'
  }

  return { evento, activar, salir }
}
