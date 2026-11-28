/**
 * Categorías, secciones, orden del catálogo y reservas, decididos con los tags de Holded.
 *
 * Vive en `shared/` porque lo necesitan los dos lados: el servidor ordena el
 * catálogo y decide qué línea de un pedido es reserva, y la pantalla agrupa por
 * secciones y pinta la reserva. Si cada lado tuviera su copia, un día la tarjeta
 * diría "Reserva" y el pedido en Holded no.
 *
 * ── TAGS QUE ENTIENDE LA TIENDA ──────────────────────────────────────────────
 *
 *   drop         Los Drops MCM: colecciones especiales que salen por tandas, con
 *                su tarjeta de tinta y su propia sección, arriba del todo para
 *                particulares y al final para delegaciones.
 *   drop001      Lo mismo, diciendo de qué drop es. Puede llevar el nombre pegado:
 *                `drop001-esenciales` (Holded lo guarda como `drop001esenciales`)
 *                sale como "Drop 001 · Esenciales".
 *   silentmerch  El nombre antiguo de los drops. Se sigue entendiendo, como Drop 001,
 *                para no tener que reetiquetar nada en Holded el día del cambio.
 *   reserva      Se puede pedir aunque no haya stock: se encarga para quien lo
 *                pide. Sin stock no sale "Sin stock", sale "Reserva".
 *
 * Los drops se venden en preventa, así que llevan la reserva incluida: no hace
 * falta ponerles también `reserva`. Cuando llega stock se venden normal, y
 * cuando se acaba vuelven a ser reserva.
 *
 * Los tags se comparan normalizando (minúsculas, sin espacios, guiones ni
 * puntos): Holded quita los guiones al guardar y quien etiqueta a mano escribe
 * "Drop 001" o "drop-001" con la misma intención.
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

/** `drop`, `drops`, `dropmcm`, `dropsmcm`, `drop001`, `drop001esenciales`… y el antiguo `silentmerch`. */
const TAG_DROP = /^(?:drops?(?:mcm)?|drop(\d{1,3})([a-z\u00e0-\u00ff]*)|silentmerch)$/

/**
 * Nombre de cada drop cuando el tag no lo trae. Si en Holded se etiqueta
 * `drop001-esenciales`, manda el tag; esto es el respaldo para `drop001` a secas
 * y para lo que sigue etiquetado como `silentmerch`.
 */
const NOMBRES_DROP: Record<string, string> = {
  '001': 'Esenciales',
}

export interface InfoDrop {
  /** "001", o null si el producto es un drop sin número. */
  numero: string | null
  /** "Esenciales", o null si no se sabe. */
  nombre: string | null
}

/** Qué drop es un producto, o null si no es de ningún drop. */
export function dropDe(producto: ConTags): InfoDrop | null {
  for (const t of producto.tags) {
    const m = normalizarTag(t).match(TAG_DROP)
    if (!m) continue
    const legado = normalizarTag(t) === 'silentmerch'
    const numero = m[1] ? m[1].padStart(3, '0') : legado ? '001' : null
    const delTag = m[2] ? m[2].charAt(0).toUpperCase() + m[2].slice(1) : null
    return { numero, nombre: delTag ?? (numero ? (NOMBRES_DROP[numero] ?? null) : null) }
  }
  return null
}

export function esDrop(producto: ConTags): boolean {
  return dropDe(producto) !== null
}

/** "Drop 001", o "Drops MCM" si el drop no tiene número. */
export function etiquetaDrop(info: InfoDrop | null): string {
  return info?.numero ? `Drop ${info.numero}` : 'Drops MCM'
}

/** Se puede pedir sin stock como reserva. */
export function esReservable(producto: ConTags): boolean {
  return tieneTag(producto, 'reserva') || esDrop(producto)
}

/**
 * ¿Pedir esto ahora es una reserva? Sólo si el producto la admite y no queda
 * stock de lo elegido: si hay en el armario, se vende como cualquier otra cosa.
 *
 * Pedido online (`soloReserva`): lo reservable se pide siempre como reserva, haya
 * stock o no, y sin precio a la vista ni pago por delante: se apunta y el equipo
 * escribe después. En el puesto y en el TPV se sigue vendiendo lo que hay.
 */
export function esReserva(producto: ConTags, stock: number, soloReserva = false): boolean {
  return esReservable(producto) && (soloReserva || stock <= 0)
}

/** Plazo que prometemos para las reservas. Sale en la tarjeta, el checkout y el correo. */
export const PLAZO_RESERVA = '2 meses como mucho'

export type IdCategoria = 'drop' | 'panuelo' | 'camiseta' | 'sudadera' | 'otros'

export interface Categoria {
  id: IdCategoria
  etiqueta: string
}

/**
 * Las categorías por nombre son un atajo: en Holded no hay categorías, y con
 * una docena de productos no hace falta inventarlas. Los drops van por tag y
 * ganan a todo lo demás (son camisetas, pero no son "las camisetas").
 */
const POR_NOMBRE: Array<Categoria & { prueba: RegExp }> = [
  { id: 'panuelo', etiqueta: 'Pañuelos', prueba: /pa[nñ]uelo/ },
  { id: 'camiseta', etiqueta: 'Camisetas', prueba: /camiseta/ },
  { id: 'sudadera', etiqueta: 'Sudaderas', prueba: /sudadera/ },
]

export const CATEGORIA_DROP: Categoria = { id: 'drop', etiqueta: 'Drops MCM' }
export const CATEGORIA_OTROS: Categoria = { id: 'otros', etiqueta: 'Otros' }

export function categoriaPorId(id: IdCategoria): Categoria {
  if (id === 'drop') return CATEGORIA_DROP
  return POR_NOMBRE.find((c) => c.id === id) ?? CATEGORIA_OTROS
}

function sinAcentos(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function categoriaDe(producto: ConNombre): Categoria {
  if (esDrop(producto)) return CATEGORIA_DROP
  const nombre = sinAcentos(producto.nombre)
  return POR_NOMBRE.find((c) => c.prueba.test(nombre)) ?? CATEGORIA_OTROS
}

/**
 * Secciones del catálogo: lo que se ve con su título al bajar por la tienda.
 * Casi siempre una por categoría, salvo camisetas y sudaderas, que van juntas:
 * con dos o tres de cada, separadas quedaban dos secciones cojas. Los chips de
 * arriba sí las separan, que para filtrar es justo lo útil.
 */
export type IdSeccion = 'drop' | 'panuelo' | 'ropa' | 'otros'

export interface Seccion {
  id: IdSeccion
  etiqueta: string
}

const SECCIONES: Record<IdSeccion, Seccion> = {
  drop: { id: 'drop', etiqueta: 'Drops MCM' },
  panuelo: { id: 'panuelo', etiqueta: 'Pañuelos' },
  ropa: { id: 'ropa', etiqueta: 'Camisetas y sudaderas' },
  otros: { id: 'otros', etiqueta: 'Otros' },
}

export function seccionDe(categoria: IdCategoria): Seccion {
  if (categoria === 'camiseta' || categoria === 'sudadera') return SECCIONES.ropa
  return SECCIONES[categoria]
}

/**
 * Orden de las categorías, que da el de las secciones y el de los chips.
 *
 *   Particulares:  Drops → camisetas y sudaderas → pañuelos → otros
 *   Delegaciones:  pañuelos → camisetas y sudaderas → otros → Drops
 *
 * Los drops abren la tienda de particulares (es la novedad y lo que más se va a
 * vender) y cierran la de delegaciones, que vienen a por sus pañuelos. Dentro
 * de "camisetas y sudaderas", primero las camisetas.
 */
export function ordenDeCategorias(modo: 'b2b' | 'b2c'): IdCategoria[] {
  return modo === 'b2b'
    ? ['panuelo', 'camiseta', 'sudadera', 'otros', 'drop']
    : ['drop', 'camiseta', 'sudadera', 'panuelo', 'otros']
}

/**
 * Ordena el catálogo por secciones. Dentro de cada una se respeta el orden de
 * Holded, que es el de alta: así lo que se da de alta junto sale junto. Los
 * drops, además, del más nuevo al más antiguo.
 */
export function ordenarPorCategoria<T extends ConNombre>(productos: T[], modo: 'b2b' | 'b2c'): T[] {
  const orden = ordenDeCategorias(modo)
  const numeroDrop = (p: T) => Number(dropDe(p)?.numero ?? 0)
  return productos
    .map((p, i) => ({ p, i, c: orden.indexOf(categoriaDe(p).id), d: numeroDrop(p) }))
    .sort((a, b) => a.c - b.c || b.d - a.d || a.i - b.i)
    .map((x) => x.p)
}
