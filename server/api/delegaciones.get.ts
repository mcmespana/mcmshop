import { listarContactos } from '../utils/holded'

/**
 * Las delegaciones locales, para el selector de la pantalla de bienvenida.
 *
 * Salen de Holded: son los contactos con el tag `mcmlocal`. Abrir una delegación
 * nueva es etiquetar su contacto, sin tocar código.
 *
 * **Sólo se devuelve id y nombre.** Este endpoint es público, así que publicar
 * aquí los correos de las delegaciones sería regalar diez direcciones a cualquiera
 * que abra la pestaña de red del navegador.
 */
export default defineCachedEventHandler(
  async () => {
    const contactos = await listarContactos()

    const delegaciones = contactos
      .filter((c) => (c.tags ?? []).some((t) => t.trim().toLowerCase() === 'mcmlocal'))
      .map((c) => ({ id: c.id, nombre: c.name }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

    return { delegaciones }
  },
  {
    name: 'delegaciones',
    getKey: () => 'v1',
    // La lista de delegaciones cambia como mucho una vez al año.
    maxAge: 60 * 60,
    swr: true,
  },
)
