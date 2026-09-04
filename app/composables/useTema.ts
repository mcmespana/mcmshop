export type Tema = 'claro' | 'oscuro' | 'sistema'

/**
 * Tema de la interfaz: claro, oscuro o el del sistema.
 *
 * Va en cookie y no en `localStorage` a propósito. El servidor tiene que saber
 * el tema para poner `data-tema` en el `<html>` que envía: si se decidiera en
 * el cliente, la página llegaría en claro y se pondría oscura al hidratar, que
 * es el parpadeo blanco de recargar de noche. La cookie viaja con la petición,
 * así que el HTML ya sale pintado.
 *
 * "sistema" no escribe atributo: deja que mande `prefers-color-scheme`, que es
 * lo que hacía la tienda antes de que esto existiera y sigue siendo el defecto.
 */
export function useTema() {
  const cookie = useCookie<Tema>('mcm_tema', {
    default: () => 'sistema',
    maxAge: 60 * 60 * 24 * 400,
    sameSite: 'lax',
  })

  const tema = useState<Tema>('tema', () => cookie.value)

  watch(tema, (v) => {
    cookie.value = v
  })

  /** Lo que se escribe en el `<html>`. En "sistema" no se escribe nada. */
  const atributo = computed(() => (tema.value === 'sistema' ? undefined : tema.value))

  const CICLO: Tema[] = ['sistema', 'claro', 'oscuro']
  function siguiente() {
    tema.value = CICLO[(CICLO.indexOf(tema.value) + 1) % CICLO.length]!
  }

  const etiqueta = computed(
    () =>
      ({ sistema: 'Tema del sistema', claro: 'Tema claro', oscuro: 'Tema oscuro' })[tema.value],
  )

  return { tema, atributo, siguiente, etiqueta }
}
