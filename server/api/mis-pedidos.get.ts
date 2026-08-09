import { aCentimos } from '../utils/dinero'
import { listarPedidosDeContacto, type EstadoPedido, type PedidoLeido } from '../utils/holded'
import { leerSesion } from '../utils/sesion'

/**
 * Estado tal y como se le cuenta a quien hizo el pedido.
 *
 * Holded usa vocabulario de contabilidad (`pending`, `overdue`) que en una tienda
 * no significa lo mismo para quien compró. Aquí se traduce a lo que de verdad le
 * importa: si está apuntado, si lo estamos preparando o si ya está.
 */
const ESTADOS: Record<EstadoPedido, { texto: string; tono: 'espera' | 'curso' | 'hecho' | 'malo' }> =
  {
    pending: { texto: 'Pendiente de pago', tono: 'espera' },
    partial: { texto: 'Pagado en parte', tono: 'curso' },
    completed: { texto: 'Completado', tono: 'hecho' },
    overdue: { texto: 'Pago vencido', tono: 'malo' },
    cancelled: { texto: 'Cancelado', tono: 'malo' },
    failed: { texto: 'Con incidencia', tono: 'malo' },
  }

function traducirEstado(pedido: PedidoLeido) {
  // Un borrador todavía no lo ha revisado nadie: decir "pendiente de pago" sería
  // mentir, porque aún no le hemos mandado ni cómo pagar.
  if (pedido.draft) return { texto: 'Recibido, lo estamos revisando', tono: 'espera' as const }
  return ESTADOS[pedido.status ?? 'pending'] ?? { texto: 'En curso', tono: 'curso' as const }
}

export default defineEventHandler(async (event) => {
  const sesion = await leerSesion(event)

  if (!sesion) {
    throw createError({ statusCode: 401, statusMessage: 'Entra con Google para ver tus pedidos.' })
  }

  // Sin contacto en Holded no hay histórico: nunca ha pedido nada con este correo.
  if (!sesion.contactoId) {
    return { pedidos: [], sinContacto: true }
  }

  const crudos = await listarPedidosDeContacto(sesion.contactoId)

  const pedidos = crudos.map((p) => {
    const estado = traducirEstado(p)
    return {
      id: p.id,
      numero: p.document_number,
      fecha: p.date,
      estado: estado.texto,
      tono: estado.tono,
      borrador: p.draft,
      totalCentimos: aCentimos(p.total) ?? 0,
      impuestosCentimos: aCentimos(p.tax) ?? 0,
      seguimiento:
        p.tracking_number || p.tracking_name
          ? { transportista: p.tracking_name, numero: p.tracking_number }
          : null,
      fechaEntrega: p.delivery_date,
      lineas: (p.lines ?? [])
        .filter((l) => l.type !== 'title')
        .map((l) => ({
          nombre: l.name,
          // Sólo en las líneas de producto la descripción es la variante (Holded
          // descarta variant_id al crear). En una línea de servicio, como el
          // transporte, la descripción es prosa y no pinta nada bajo el nombre.
          variante: l.type === 'product' ? l.description : null,
          unidades: Number(String(l.units).replace(',', '.')) || 0,
          precioCentimos: aCentimos(l.price) ?? 0,
        })),
    }
  })

  return { pedidos, sinContacto: false }
})
