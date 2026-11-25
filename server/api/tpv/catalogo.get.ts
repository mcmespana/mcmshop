import { obtenerCatalogo } from '../../utils/catalogo'
import { exigirTpv } from '../../utils/tpv'
import { ordenarPorCategoria } from '../../../shared/utils/categorias'

/**
 * Catálogo del TPV: todo lo que se vende, a delegaciones o a particulares.
 *
 * En el puesto o al teléfono se le vende a quien sea, así que no tiene sentido
 * separar por público. Sólo se dejan fuera los productos sin ninguno de los dos
 * tags, que son los que el equipo aún no ha decidido poner a la venta.
 */
export default defineEventHandler(async (event) => {
  await exigirTpv(event)
  const catalogo = await obtenerCatalogo()
  const { catalogoSinFiltro } = useRuntimeConfig()

  const productos = catalogoSinFiltro
    ? catalogo.productos
    : catalogo.productos.filter((p) =>
        p.tags.some((t) => ['b2b', 'b2c'].includes(t.trim().toLowerCase())),
      )

  // En el puesto se vende sobre todo a particulares: su orden, Silent Merch delante.
  return { productos: ordenarPorCategoria(productos, 'b2c'), generadoEn: catalogo.generadoEn }
})
