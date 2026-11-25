/**
 * Categorías, orden del catálogo y reservas, decididos con los tags de Holded.
 *
 * Vive en `shared/` porque lo necesitan los dos lados: el servidor ordena el
 * catálogo y decide qué línea de un pedido es reserva, y la pantalla agrupa por
 * secciones y pinta la reserva. Si cada lado tuviera su copia, un día la tarjeta
 * diría "Reserva" y el pedido en Holded no.
 *
 * ── TAGS QUE ENTIENDE LA TIENDA ──────────────────────────────────────────────
 *
 *   silentmerch  La colección Silent Merch: diseño especial, su propia sección,
 *                arriba del todo para particulares y al final para delegaciones.
 *   reserva      Se puede pedir aunque no haya stock: se encarga para quien lo
 *                pide. Sin stock no sale "Sin stock", sale "Reserva".
 *
 * El Silent Merch se vende en preventa, así que lleva la reserva incluida: no
 * hace falta ponerle también `reserva`. Cuando llegue stock se vende normal, y
 * cuando se acabe vuelve a ser reserva.
 *
 * Los tags se comparan normalizando (minúsculas, sin espacios, guiones ni
 * puntos): Holded quita los guiones al guardar y quien etiqueta a mano escribe
 * "Silent Merch" o "silent-merch" con la misma intención.
 */

interface ConTags {
  tags: string[]
}

interface ConNombre extends ConTags {
  nombre: string
}

function normalizarTag(tag: string): string {
  return tag.toLowerCase().replace(/[\s._-]/g, '')
}

export function tieneTag(producto: ConTags, tag: string): boolean {
  const buscado = normalizarTag(tag)
  return producto.tags.some((t) => normalizarTag(t) === buscado)
}

export function esSilentMerch(producto: ConTags): boolean {
  return tieneTag(producto, 'silentmerch')
}

/** Se puede pedir sin stock como reserva. */
export function esReservable(producto: ConTags): boolean {
  return tieneTag(producto, 'reserva') || esSilentMerch(producto)
}

/**
 * ¿Pedir esto ahora es una reserva? Sólo si el producto la admite y no queda
 * stock de lo elegido: si hay en el armario, se vende como cualquier otra cosa.
 */
export function esReserva(producto: ConTags, stock: number): boolean {
  return esReservable(producto) && stock <= 0
}

/** Plazo que prometemos para las reservas. Sale en la tarjeta, el checkout y el correo. */
export const PLAZO_RESERVA = '2 meses como mucho'

export type IdCategoria = 'silentmerch' | 'panuelo' | 'camiseta' | 'sudadera' | 'otros'

export interface Categoria {
  id: IdCategoria
  etiqueta: string
}

/**
 * Las categorías por nombre son un atajo: en Holded no hay categorías, y con
 * una docena de productos no hace falta inventarlas. El Silent Merch va por
 * tag y gana a todo lo demás (son camisetas, pero no son "las camisetas").
 */
const POR_NOMBRE: Array<Categoria & { prueba: RegExp }> = [
  { id: 'panuelo', etiqueta: 'Pañuelos', prueba: /pa[nñ]uelo/ },
  { id: 'camiseta', etiqueta: 'Camisetas', prueba: /camiseta/ },
  { id: 'sudadera', etiqueta: 'Sudaderas', prueba: /sudadera/ },
]

export const CATEGORIA_SILENT: Categoria = { id: 'silentmerch', etiqueta: 'Silent Merch' }
export const CATEGORIA_OTROS: Categoria = { id: 'otros', etiqueta: 'Otros' }

function sinAcentos(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function categoriaDe(producto: ConNombre): Categoria {
  if (esSilentMerch(producto)) return CATEGORIA_SILENT
  const nombre = sinAcentos(producto.nombre)
  return POR_NOMBRE.find((c) => c.prueba.test(nombre)) ?? CATEGORIA_OTROS
}

/**
 * Orden de las secciones. Lo de siempre primero —pañuelos, camisetas,
 * sudaderas— y lo demás detrás. El Silent Merch abre la tienda de particulares
 * (es la novedad y lo que más se va a vender) y cierra la de delegaciones, que
 * vienen a por sus pañuelos y sus guías.
 */
export function ordenDeCategorias(modo: 'b2b' | 'b2c'): IdCategoria[] {
  const base: IdCategoria[] = ['panuelo', 'camiseta', 'sudadera', 'otros']
  return modo === 'b2b' ? [...base, 'silentmerch'] : ['silentmerch', ...base]
}

/**
 * Ordena el catálogo por secciones. Dentro de cada una se respeta el orden de
 * Holded, que es el de alta: así lo que se da de alta junto sale junto.
 */
export function ordenarPorCategoria<T extends ConNombre>(productos: T[], modo: 'b2b' | 'b2c'): T[] {
  const orden = ordenDeCategorias(modo)
  return productos
    .map((p, i) => ({ p, i, c: orden.indexOf(categoriaDe(p).id) }))
    .sort((a, b) => a.c - b.c || a.i - b.i)
    .map((x) => x.p)
}
