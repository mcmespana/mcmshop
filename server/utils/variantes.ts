/**
 * Las 49 variantes del catálogo tienen `options: []` vacío y no tienen nombre:
 * el color y la talla sólo existen dentro del `barcode` o del `sku`, y cada
 * producto usa un convenio distinto. Ver HALLAZGOS.md.
 *
 *   Camisetas M+C   barcode "Camiseta M+C Azul Royal XL"   → color + talla
 *   Sudaderas M+C   barcode "Sudadera M+C Talla S"         → talla
 *   Pañuelos MCM    barcode "Pañuelo COM Verde"            → tipo, sin talla
 *   Guías del COM   barcode vacío, sku "CONOC. I"          → edición
 *
 * Este módulo saca de ahí una etiqueta legible sin romperse nunca: si nada
 * encaja, devuelve el texto crudo. Un producto nuevo mal rotulado se verá feo,
 * pero no tumbará el catálogo.
 */

/** Tallas reconocidas, en orden de presentación (no alfabético). */
const TALLAS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const

/** Sinónimos que se normalizan a la talla canónica. */
const ALIAS_TALLA: Record<string, string> = {
  '2XL': 'XXL',
  '3XL': 'XXXL',
  TALLAUNICA: 'ÚNICA',
  UNICA: 'ÚNICA',
}

export interface EtiquetaVariante {
  /** Texto completo para mostrar: "Azul Royal · XL". */
  etiqueta: string
  /** Talla canónica en mayúsculas, o null si el producto no va por tallas. */
  talla: string | null
  /** Lo que no es talla: color, edición, tipo. Null si sólo hay talla. */
  opcion: string | null
  /** Aclaración entre corchetes en el rótulo, p. ej. "No oficial". */
  nota: string | null
  /** Índice para ordenar tallas de menor a mayor. */
  orden: number
}

/** Minúsculas, sin acentos y sin dobles espacios. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** "camisetas" y "camiseta" son la misma palabra a efectos de quitar el prefijo. */
function mismaPalabra(a: string, b: string): boolean {
  const na = normalizar(a)
  const nb = normalizar(b)
  if (na === nb) return true
  return na.replace(/s$/, '') === nb.replace(/s$/, '')
}

/**
 * Quita del rótulo de la variante el prefijo que repite el nombre del producto.
 * "Camisetas M+C" + "Camiseta M+C Verde M" → "Verde M"
 * Se para en cuanto una palabra deja de coincidir, para no comerse información:
 * "Pañuelos MCM" + "Pañuelo COM Verde" → "COM Verde" (MCM ≠ COM).
 */
function quitarPrefijo(rotulo: string, nombreProducto: string): string {
  const palabras = rotulo.trim().split(/\s+/)
  const prefijo = nombreProducto.trim().split(/\s+/)

  let i = 0
  while (i < prefijo.length && i < palabras.length - 1 && mismaPalabra(palabras[i]!, prefijo[i]!)) {
    i++
  }
  return palabras.slice(i).join(' ')
}

/** Separa una nota entre corchetes al final: "Celeste S [No oficial]". */
function extraerNota(texto: string): { limpio: string; nota: string | null } {
  const m = texto.match(/\s*\[([^\]]+)\]\s*$/)
  if (!m) return { limpio: texto.trim(), nota: null }
  return { limpio: texto.slice(0, m.index).trim(), nota: m[1]!.trim() }
}

/** Reconoce una palabra como talla y la devuelve canónica, o null. */
function comoTalla(palabra: string): string | null {
  const bruta = palabra.toUpperCase().replace(/[^A-ZÁÉÍÓÚ0-9]/g, '')
  const canonica = ALIAS_TALLA[bruta] ?? bruta
  if ((TALLAS as readonly string[]).includes(canonica)) return canonica
  if (canonica === 'ÚNICA') return 'ÚNICA'
  return null
}

interface VarianteHolded {
  id: string
  sku?: string | null
  barcode?: string | null
}

/**
 * Resuelve la etiqueta de una variante.
 * Cadena de respaldo: barcode → sku → "Opción N".
 */
export function etiquetarVariante(
  variante: VarianteHolded,
  nombreProducto: string,
  indice: number,
): EtiquetaVariante {
  const bruto = (variante.barcode?.trim() || variante.sku?.trim() || '').trim()

  if (!bruto) {
    return { etiqueta: `Opción ${indice + 1}`, talla: null, opcion: null, nota: null, orden: 999 }
  }

  const { limpio, nota } = extraerNota(bruto)
  const sinPrefijo = quitarPrefijo(limpio, nombreProducto) || limpio

  const palabras = sinPrefijo.split(/\s+/).filter(Boolean)

  // La talla, si la hay, es la última palabra. "Talla S" y "S" valen igual.
  let talla: string | null = null
  if (palabras.length > 0) {
    talla = comoTalla(palabras[palabras.length - 1]!)
    if (talla) palabras.pop()
  }

  // Sobra la muletilla "Talla" delante del valor: "Sudadera M+C Talla S".
  if (talla && palabras.length > 0 && normalizar(palabras[palabras.length - 1]!) === 'talla') {
    palabras.pop()
  }

  const opcion = palabras.join(' ').trim() || null

  const etiqueta = [opcion, talla].filter(Boolean).join(' · ') || limpio
  const orden = talla ? (TALLAS as readonly string[]).indexOf(talla) : 500

  return { etiqueta, talla, opcion, nota, orden: orden === -1 ? 500 : orden }
}

/**
 * Qué tipo de selector necesita el producto.
 * - `talla`  → todas las variantes son tallas del mismo artículo
 * - `opcion` → no hay tallas: colores, ediciones, tipos
 * - `mixto`  → hay color y talla, hacen falta dos selectores
 */
export type EjeVariacion = 'talla' | 'opcion' | 'mixto' | 'ninguno'

export function ejeDeVariacion(etiquetas: EtiquetaVariante[]): EjeVariacion {
  if (etiquetas.length === 0) return 'ninguno'
  const conTalla = etiquetas.filter((e) => e.talla).length
  const conOpcion = etiquetas.filter((e) => e.opcion).length

  if (conTalla === 0) return 'opcion'
  if (conOpcion === 0) return 'talla'
  return 'mixto'
}
