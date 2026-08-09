/**
 * Construye el catálogo que consume el portal a partir de los datos crudos de Holded.
 *
 * Holded manda: aquí no se inventa nada que no esté en el ERP. Lo único que se
 * añade es interpretación (etiquetas de variante) y criterio de visibilidad.
 */

import { aCentimos } from './dinero'
import { ejeDeVariacion, etiquetarVariante, type EjeVariacion } from './variantes'
import { listarImagenes, listarProductos, type ProductoHolded } from './holded'

export interface ImagenCatalogo {
  url: string
  miniatura: string
  ancho: number
  alto: number
}

export interface VarianteCatalogo {
  id: string
  etiqueta: string
  talla: string | null
  opcion: string | null
  nota: string | null
  sku: string | null
  precioCentimos: number | null
  stock: number
}

export interface ProductoCatalogo {
  id: string
  nombre: string
  descripcion: string | null
  sku: string | null
  tags: string[]
  precioCentimos: number
  imagenes: ImagenCatalogo[]
  variantes: VarianteCatalogo[]
  eje: EjeVariacion
  stock: number
}

export interface Catalogo {
  productos: ProductoCatalogo[]
  generadoEn: string
  /** Productos que no salen a la venta y por qué. Diagnóstico para el equipo. */
  excluidos: Array<{ nombre: string; motivo: string }>
  /**
   * True cuando ningún producto lleva los tags `b2b`/`b2c`. Mientras eso pase no se
   * puede filtrar por público, así que se muestra todo lo vendible y se avisa.
   */
  sinEtiquetar: boolean
}

export type Modo = 'b2b' | 'b2c'

/** Suma el stock de una variante, o del producto entero, en el almacén configurado. */
function stockDe(producto: ProductoHolded, idVariante: string | null, almacen: string): number {
  const desglose = producto.stocks ?? []

  if (almacen && desglose.length > 0) {
    return desglose
      .filter((e) => e.warehouse_id === almacen && (idVariante ? e.variant_id === idVariante : true))
      .reduce((suma, e) => suma + (Number(e.stock) || 0), 0)
  }

  if (idVariante) {
    if (desglose.length > 0) {
      return desglose
        .filter((e) => e.variant_id === idVariante)
        .reduce((suma, e) => suma + (Number(e.stock) || 0), 0)
    }
    const variante = producto.variants?.find((v) => v.id === idVariante)
    return Number(variante?.stock) || 0
  }

  return Number(producto.stock) || 0
}

function mapearImagenes(
  imagenes: Awaited<ReturnType<typeof listarImagenes>>,
): ImagenCatalogo[] {
  return imagenes
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((img) => {
      const grande = img.sizes?.large ?? img.sizes?.original
      return {
        url: grande?.url ?? img.url,
        miniatura: img.sizes?.small?.url ?? img.sizes?.thumbnail?.url ?? img.url,
        ancho: grande?.width ?? 0,
        alto: grande?.height ?? 0,
      }
    })
}

/** Lanza las peticiones de imágenes de N en N para no castigar la API. */
async function porTandas<T, R>(
  elementos: T[],
  tamano: number,
  tarea: (elemento: T) => Promise<R>,
): Promise<R[]> {
  const resultados: R[] = []
  for (let i = 0; i < elementos.length; i += tamano) {
    resultados.push(...(await Promise.all(elementos.slice(i, i + tamano).map(tarea))))
  }
  return resultados
}

async function construirCatalogo(): Promise<Catalogo> {
  const { warehouseId } = useRuntimeConfig()
  const crudos = await listarProductos()

  const excluidos: Array<{ nombre: string; motivo: string }> = []
  const candidatos: ProductoHolded[] = []

  for (const p of crudos) {
    if (p.archived) {
      excluidos.push({ nombre: p.name, motivo: 'archivado en Holded' })
      continue
    }
    if (!p.for_sale) {
      excluidos.push({ nombre: p.name, motivo: 'marcado como no vendible' })
      continue
    }
    const precio = aCentimos(p.price)
    if (precio === null || precio === 0) {
      // Sin precio no se puede vender: mejor no mostrarlo que mostrarlo a cero.
      excluidos.push({ nombre: p.name, motivo: 'sin precio en la tarifa principal' })
      continue
    }
    candidatos.push(p)
  }

  const imagenesPorProducto = new Map<string, ImagenCatalogo[]>()
  await porTandas(candidatos, 5, async (p) => {
    try {
      imagenesPorProducto.set(p.id, mapearImagenes(await listarImagenes(p.id)))
    } catch {
      // Que un producto se quede sin foto no puede tumbar el catálogo entero.
      imagenesPorProducto.set(p.id, [])
    }
  })

  const productos: ProductoCatalogo[] = candidatos.map((p) => {
    const precioBase = aCentimos(p.price) ?? 0

    // Se etiqueta primero y se ordena por el índice de talla (S < M < L < XL),
    // no alfabéticamente, que dejaría "L, M, S, XL".
    const etiquetadas = (p.variants ?? [])
      .filter((v) => !v.archived)
      .map((v, i) => ({ variante: v, etiqueta: etiquetarVariante(v, p.name, i) }))
      .sort(
        (a, b) =>
          a.etiqueta.orden - b.etiqueta.orden ||
          a.etiqueta.etiqueta.localeCompare(b.etiqueta.etiqueta, 'es'),
      )

    const variantes: VarianteCatalogo[] = etiquetadas.map(({ variante, etiqueta }) => ({
      id: variante.id,
      etiqueta: etiqueta.etiqueta,
      talla: etiqueta.talla,
      opcion: etiqueta.opcion,
      nota: etiqueta.nota,
      sku: variante.sku,
      precioCentimos: aCentimos(variante.price) ?? precioBase,
      stock: stockDe(p, variante.id, warehouseId),
    }))

    return {
      id: p.id,
      nombre: p.name,
      descripcion: p.description?.trim() || null,
      sku: p.sku,
      tags: p.tags ?? [],
      precioCentimos: precioBase,
      imagenes: imagenesPorProducto.get(p.id) ?? [],
      variantes,
      eje: ejeDeVariacion(etiquetadas.map((e) => e.etiqueta)),
      stock: stockDe(p, null, warehouseId),
    }
  })

  const sinEtiquetar = !productos.some(
    (p) => p.tags.includes('b2b') || p.tags.includes('b2c'),
  )

  return {
    productos,
    generadoEn: new Date().toISOString(),
    excluidos,
    sinEtiquetar,
  }
}

/**
 * Catálogo cacheado con semántica stale-while-revalidate: el usuario recibe siempre
 * la copia guardada al instante y el refresco contra Holded ocurre por detrás.
 * El webhook de Holded invalida esta clave cuando cambia algo, así que los 5 minutos
 * son sólo la red de seguridad por si un evento se pierde.
 */
export const obtenerCatalogo = defineCachedFunction(construirCatalogo, {
  name: 'catalogo',
  getKey: () => 'v1',
  maxAge: 60 * 5,
  swr: true,
})

/**
 * Filtra por público. El criterio vive en Holded (tags `b2b` / `b2c`), así que sacar
 * un producto nuevo no requiere tocar código.
 * Mientras no haya ni un solo producto etiquetado se muestra todo lo vendible: es
 * preferible una tienda que funciona con un aviso a una tienda vacía sin explicación.
 */
export function filtrarPorModo(catalogo: Catalogo, modo: Modo): ProductoCatalogo[] {
  if (catalogo.sinEtiquetar) return catalogo.productos
  return catalogo.productos.filter((p) => p.tags.includes(modo))
}
