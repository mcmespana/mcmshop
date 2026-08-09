import { descargarPdfPedido, obtenerPedido } from '../../../utils/holded'
import { leerSesion } from '../../../utils/sesion'

/**
 * Sirve el PDF del pedido.
 *
 * Se comprueba SIEMPRE que el pedido pertenece al contacto de la sesión antes de
 * devolver nada. Sin esa comprobación, cualquiera con una sesión válida podría
 * pedir el PDF de cualquier pedido de la asociación cambiando el id de la URL.
 */
export default defineEventHandler(async (event) => {
  const sesion = await leerSesion(event)
  if (!sesion?.contactoId) {
    throw createError({ statusCode: 401, statusMessage: 'Entra con Google para ver tus pedidos.' })
  }

  const id = getRouterParam(event, 'id')
  if (!id || !/^[a-f0-9]{24}$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Pedido no válido.' })
  }

  const pedido = await obtenerPedido(id).catch(() => null)

  // Mismo error para "no existe" y "no es tuyo": no se confirma qué ids existen.
  if (!pedido || pedido.contact_id !== sesion.contactoId) {
    throw createError({ statusCode: 404, statusMessage: 'Ese pedido no existe.' })
  }

  const pdf = await descargarPdfPedido(id)
  const nombre = pedido.document_number ?? id

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `inline; filename="pedido-${nombre}.pdf"`)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return new Uint8Array(pdf)
})
