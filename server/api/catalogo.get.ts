import { z } from 'zod'
import { filtrarPorModo, obtenerCatalogo } from '../utils/catalogo'

const consulta = z.object({
  modo: z.enum(['b2b', 'b2c']).default('b2c'),
})

export default defineEventHandler(async (event) => {
  const { modo } = consulta.parse(getQuery(event))

  const catalogo = await obtenerCatalogo()

  return {
    modo,
    productos: filtrarPorModo(catalogo, modo),
    generadoEn: catalogo.generadoEn,
    // Diagnóstico para el equipo, no para el cliente final.
    diagnostico: {
      sinEtiquetar: catalogo.sinEtiquetar,
      excluidos: catalogo.excluidos,
      avisos: catalogo.avisos,
    },
  }
})
