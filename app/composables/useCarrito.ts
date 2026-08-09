import type { ProductoCatalogo, VarianteCatalogo } from '~~/server/utils/catalogo'

export interface LineaCarrito {
  /** Clave estable de la línea: producto + variante. */
  clave: string
  productoId: string
  varianteId: string | null
  nombre: string
  /** Etiqueta de la variante ("Azul Royal · XL"), o null en productos simples. */
  variante: string | null
  sku: string | null
  precioCentimos: number
  cantidad: number
  imagen: string | null
  /** Stock que tenía la variante al añadirla. Sólo informativo. */
  stock: number
}

const CLAVE_ALMACEN = 'mcm_carrito_v1'

function claveDe(productoId: string, varianteId: string | null) {
  return varianteId ? `${productoId}#${varianteId}` : productoId
}

export function useCarrito() {
  const lineas = useState<LineaCarrito[]>('carrito', () => [])
  const abierto = useState<boolean>('carrito-abierto', () => false)

  // El carrito vive sólo en el navegador: no hay base de datos en este proyecto.
  onMounted(() => {
    if (lineas.value.length > 0) return
    try {
      const guardado = localStorage.getItem(CLAVE_ALMACEN)
      if (guardado) lineas.value = JSON.parse(guardado)
    } catch {
      // Un carrito corrupto no puede impedir entrar a la tienda.
      localStorage.removeItem(CLAVE_ALMACEN)
    }
  })

  if (import.meta.client) {
    watch(
      lineas,
      (valor) => {
        try {
          localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(valor))
        } catch {
          // Sin espacio o en modo privado: se pierde al recargar, pero funciona.
        }
      },
      { deep: true },
    )
  }

  function anadir(producto: ProductoCatalogo, variante: VarianteCatalogo | null, cantidad = 1) {
    if (cantidad < 1) return
    const clave = claveDe(producto.id, variante?.id ?? null)
    const existente = lineas.value.find((l) => l.clave === clave)

    if (existente) {
      existente.cantidad += cantidad
    } else {
      lineas.value.push({
        clave,
        productoId: producto.id,
        varianteId: variante?.id ?? null,
        nombre: producto.nombre,
        variante: variante?.etiqueta ?? null,
        sku: variante?.sku ?? producto.sku,
        precioCentimos: variante?.precioCentimos ?? producto.precioCentimos,
        cantidad,
        imagen: producto.imagenes[0]?.miniatura ?? null,
        stock: variante?.stock ?? producto.stock,
      })
    }
    abierto.value = true
  }

  function cambiarCantidad(clave: string, cantidad: number) {
    const linea = lineas.value.find((l) => l.clave === clave)
    if (!linea) return
    if (cantidad <= 0) {
      quitar(clave)
      return
    }
    linea.cantidad = cantidad
  }

  function quitar(clave: string) {
    lineas.value = lineas.value.filter((l) => l.clave !== clave)
  }

  function vaciar() {
    lineas.value = []
  }

  const unidades = computed(() => lineas.value.reduce((s, l) => s + l.cantidad, 0))
  const totalCentimos = computed(() =>
    lineas.value.reduce((s, l) => s + l.precioCentimos * l.cantidad, 0),
  )
  const vacio = computed(() => lineas.value.length === 0)

  return {
    lineas,
    abierto,
    anadir,
    cambiarCantidad,
    quitar,
    vaciar,
    unidades,
    totalCentimos,
    vacio,
  }
}
