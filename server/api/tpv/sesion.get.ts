import { tpvAbierto, tpvConfigurado, tpvLibre } from '../../utils/tpv'

/** ¿Este dispositivo ha entrado al TPV? */
export default defineEventHandler(async (event) => ({
  configurado: tpvConfigurado(),
  abierto: await tpvAbierto(event),
  /** Abierto sin clave: no tiene sentido ofrecer "Salir del TPV". */
  libre: tpvLibre(),
}))
