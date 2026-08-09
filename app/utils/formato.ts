/** Formatea céntimos como euros: 1234 → "12,34 €". A cero se dice "Gratis". */
export function formatearEuros(centimos: number): string {
  if (centimos === 0) return 'Gratis'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
    centimos / 100,
  )
}

/**
 * Texto honesto sobre la disponibilidad.
 *
 * El stock puede ser negativo y eso no se esconde: significa que hay pedidos por
 * encima de lo que queda en el armario. Se puede pedir igual, pero tardará más.
 */
export function textoStock(stock: number): { texto: string; tono: 'ok' | 'poco' | 'agotado' } | null {
  if (stock < 0) return { texto: 'Sin stock ahora mismo', tono: 'agotado' }
  if (stock === 0) return { texto: 'Sin stock', tono: 'agotado' }
  if (stock <= 5) return { texto: `Quedan ${stock}`, tono: 'poco' }
  return null
}

/** Aviso largo para cuando se añade algo que no está en el armario. */
export const AVISO_SIN_STOCK =
  'No nos queda en el armario. Puedes pedirlo igualmente: lo encargamos, pero tardará más en llegarte.'
