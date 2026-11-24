import { cerrarTpv } from '../../utils/tpv'

/** Cerrar el TPV en este dispositivo (por ejemplo, al devolver un móvil prestado). */
export default defineEventHandler((event) => {
  cerrarTpv(event)
  return { ok: true }
})
