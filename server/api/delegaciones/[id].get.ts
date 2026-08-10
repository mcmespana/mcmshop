import { obtenerContacto } from '../../utils/holded'

/**
 * Ficha completa de una MCM Local concreta: email y dirección, para
 * autorrellenar el checkout.
 *
 * A diferencia de `/api/delegaciones` (que sólo da id y nombre para no publicar
 * de golpe los diez correos), aquí se entrega el contacto completo — pero sólo
 * de un id que ya se conoce, porque sale del propio listado público. Y se
 * comprueba que ese contacto siga llevando el tag `mcmlocal`: el id por sí solo
 * no basta para acceder a cualquier contacto del CRM.
 */
export default defineCachedEventHandler(
  async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id || !/^[a-f0-9]{24}$/.test(id)) {
      throw createError({ statusCode: 400, statusMessage: 'MCM Local no válida.' })
    }

    const contacto = await obtenerContacto(id).catch(() => null)
    if (!contacto || !(contacto.tags ?? []).some((t) => t.trim().toLowerCase() === 'mcmlocal')) {
      throw createError({ statusCode: 404, statusMessage: 'Esa MCM Local no existe.' })
    }

    return {
      id: contacto.id,
      nombre: contacto.name,
      email: contacto.email,
      direccion: contacto.bill_address,
    }
  },
  {
    name: 'delegacion-detalle',
    getKey: (event) => getRouterParam(event, 'id') ?? 'sin-id',
    maxAge: 60 * 60,
    swr: true,
  },
)
