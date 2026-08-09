/**
 * Holded devuelve los importes como cadena con coma decimal ("4,00", "1.234,56").
 * Aquí se convierten a céntimos enteros y no se sale de enteros en toda la app:
 * los totales de un carrito con IVA y descuentos en coma flotante acaban dando
 * 41,99999999 tarde o temprano.
 */

/**
 * Decide qué separador es el decimal en una cadena numérica.
 * Devuelve la posición del separador decimal, o -1 si el número no tiene decimales.
 */
function posicionDecimal(cuerpo: string): number {
  const ultimaComa = cuerpo.lastIndexOf(',')
  const ultimoPunto = cuerpo.lastIndexOf('.')

  if (ultimaComa === -1 && ultimoPunto === -1) return -1

  // Con los dos separadores presentes, el último es el decimal: "1.234,56" / "1,234.56".
  if (ultimaComa !== -1 && ultimoPunto !== -1) return Math.max(ultimaComa, ultimoPunto)

  const separador = ultimaComa !== -1 ? ',' : '.'
  const posicion = ultimaComa !== -1 ? ultimaComa : ultimoPunto

  // Repetido sólo puede ser separador de millares: "1.234.567".
  if (cuerpo.indexOf(separador) !== posicion) return -1

  // Exactamente tres dígitos detrás y nada más: es un millar ("1.234"), no 1 euro con 234.
  if (cuerpo.length - posicion - 1 === 3) return -1

  return posicion
}

/** Convierte un importe de Holded a céntimos. Devuelve null si no hay precio. */
export function aCentimos(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null

  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? Math.round(valor * 100) : null
  }

  const limpio = valor.trim().replace(/[^\d.,-]/g, '')
  if (limpio === '' || limpio === '-') return null

  const negativo = limpio.startsWith('-')
  const cuerpo = negativo ? limpio.slice(1) : limpio

  const separador = posicionDecimal(cuerpo)
  const entera = (separador === -1 ? cuerpo : cuerpo.slice(0, separador)).replace(/[.,]/g, '')
  const decimal = (separador === -1 ? '' : cuerpo.slice(separador + 1)).replace(/[.,]/g, '')

  if (entera === '' && decimal === '') return null
  if (!/^\d*$/.test(entera) || !/^\d*$/.test(decimal)) return null

  // Se redondea al céntimo si vienen más de dos decimales.
  const fraccion = decimal === '' ? 0 : Math.round(Number(`0.${decimal}`) * 100)
  const centimos = Number(entera || '0') * 100 + fraccion

  if (!Number.isFinite(centimos)) return null
  return negativo ? -centimos : centimos
}

/** Formatea céntimos como euros en castellano: 1234 → "12,34 €". */
export function formatearEuros(centimos: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(centimos / 100)
}

/** Convierte céntimos al formato que espera la API de Holded: 1234 → "12.34". */
export function aImporteHolded(centimos: number): string {
  return (centimos / 100).toFixed(2)
}
