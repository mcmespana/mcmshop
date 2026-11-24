import { tpvAbierto, tpvConfigurado } from '../../utils/tpv'

/** ¿Este dispositivo ha entrado al TPV? */
export default defineEventHandler(async (event) => ({
  configurado: tpvConfigurado(),
  abierto: await tpvAbierto(event),
}))
