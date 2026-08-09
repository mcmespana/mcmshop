/**
 * Correos con Resend, llamando a su API REST directamente.
 *
 * Sin SDK a propósito: es una petición HTTP y el proyecto va corto de
 * dependencias por decisión de diseño.
 *
 * Los correos NUNCA tumban un pedido. Si Resend falla, el pedido ya está en
 * Holded y el equipo lo ve igual; avisar al cliente es importante, pero menos
 * que no perder la venta.
 */

import { formatearEuros } from './dinero'

export interface LineaCorreo {
  nombre: string
  variante: string | null
  cantidad: number
  precioCentimos: number
}

export interface DatosCorreo {
  cliente: { nombre: string; email: string }
  lineas: LineaCorreo[]
  totalCentimos: number
  modo: 'b2b' | 'b2c'
  transporte: 'consolacion' | 'mensajeria'
  notas?: string
}

async function enviar(opciones: {
  para: string | string[]
  asunto: string
  html: string
  responderA?: string
}): Promise<boolean> {
  const { resendApiKey, correoRemitente } = useRuntimeConfig()
  if (!resendApiKey || !correoRemitente) {
    console.warn('[correo] Resend no está configurado; no se envía nada.')
    return false
  }

  try {
    const respuesta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: correoRemitente,
        to: Array.isArray(opciones.para) ? opciones.para : [opciones.para],
        subject: opciones.asunto,
        html: opciones.html,
        ...(opciones.responderA ? { reply_to: opciones.responderA } : {}),
      }),
    })

    if (!respuesta.ok) {
      console.error('[correo] Resend respondió', respuesta.status, await respuesta.text())
      return false
    }
    return true
  } catch (error) {
    console.error('[correo] No se ha podido contactar con Resend:', error)
    return false
  }
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Tabla de líneas. Con estilos en línea, que es lo único fiable en correo. */
function tablaLineas(lineas: LineaCorreo[], totalCentimos: number): string {
  const filas = lineas
    .map(
      (l) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e8e6e1;">
          <strong style="font-weight:600;">${escapar(l.nombre)}</strong>
          ${l.variante ? `<br><span style="color:#6b6a66;font-size:13px;">${escapar(l.variante)}</span>` : ''}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #e8e6e1;text-align:center;white-space:nowrap;">
          ${l.cantidad}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #e8e6e1;text-align:right;white-space:nowrap;">
          ${formatearEuros(l.precioCentimos * l.cantidad)}
        </td>
      </tr>`,
    )
    .join('')

  return `
    <table role="presentation" width="100%" style="border-collapse:collapse;margin:16px 0;font-size:14px;">
      <thead>
        <tr style="color:#6b6a66;font-size:12px;text-align:left;">
          <th style="padding-bottom:6px;font-weight:500;">Artículo</th>
          <th style="padding-bottom:6px;font-weight:500;text-align:center;">Uds.</th>
          <th style="padding-bottom:6px;font-weight:500;text-align:right;">Importe</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding-top:12px;font-weight:600;">Total</td>
          <td style="padding-top:12px;text-align:right;font-weight:600;">
            ${formatearEuros(totalCentimos)}
          </td>
        </tr>
      </tfoot>
    </table>`
}

function envoltorio(contenido: string): string {
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#faf9f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#2b2a26;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <p style="margin:0 0 24px;font-weight:600;font-size:15px;">Tienda MCM</p>
    ${contenido}
    <p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #e8e6e1;color:#6b6a66;font-size:12px;line-height:1.5;">
      Asociación Juvenil Movimiento Consolación para el Mundo
    </p>
  </div>
</body></html>`
}

const TRANSPORTE = {
  consolacion:
    'Te llegará cuando alguien de la Familia Consolación vaya para allá. Sin coste de envío.',
  mensajeria:
    'Te lo enviamos por agencia. El coste depende del destino y del peso, así que te lo confirmamos por correo antes de enviar nada.',
} as const

/** Confirmación al cliente, con las instrucciones de pago según el público. */
export function confirmacionCliente(datos: DatosCorreo): Promise<boolean> {
  const pago =
    datos.modo === 'b2b'
      ? `<p style="margin:0 0 8px;">El pago es por <strong>transferencia</strong>. En cuanto revisemos el pedido te mandamos el IBAN y la referencia.</p>`
      : `<p style="margin:0 0 8px;">El pago es por <strong>Bizum ONG</strong>. En cuanto revisemos el pedido te mandamos el código y las instrucciones.</p>`

  return enviar({
    para: datos.cliente.email,
    asunto: 'Hemos recibido tu pedido · Tienda MCM',
    html: envoltorio(`
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;">Pedido recibido</h1>
      <p style="margin:0 0 16px;line-height:1.5;">
        Hola${datos.cliente.nombre ? ` ${escapar(datos.cliente.nombre.split(' ')[0]!)}` : ''},
        te hemos apuntado esto:
      </p>
      ${tablaLineas(datos.lineas, datos.totalCentimos)}
      <h2 style="margin:24px 0 6px;font-size:15px;font-weight:600;">Cómo te llega</h2>
      <p style="margin:0 0 16px;line-height:1.5;">${TRANSPORTE[datos.transporte]}</p>
      <h2 style="margin:24px 0 6px;font-size:15px;font-weight:600;">Cómo se paga</h2>
      ${pago}
      <p style="margin:24px 0 0;line-height:1.5;color:#6b6a66;">
        Si algo no cuadra, responde a este correo y lo miramos.
      </p>
    `),
  })
}

/** Aviso al equipo, con lo que hace falta para prepararlo sin abrir Holded. */
export function avisoEquipo(datos: DatosCorreo & { idPedido: string }): Promise<boolean> {
  const { correoEquipo } = useRuntimeConfig()
  if (!correoEquipo) return Promise.resolve(false)

  return enviar({
    para: correoEquipo,
    responderA: datos.cliente.email,
    asunto: `Pedido web de ${datos.cliente.nombre} · ${formatearEuros(datos.totalCentimos)}`,
    html: envoltorio(`
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;">Pedido nuevo desde la web</h1>
      <p style="margin:0 0 4px;">
        <strong>${escapar(datos.cliente.nombre)}</strong>
        (${datos.modo === 'b2b' ? 'delegación' : 'particular'})
      </p>
      <p style="margin:0 0 16px;color:#6b6a66;font-size:13px;">${escapar(datos.cliente.email)}</p>
      ${tablaLineas(datos.lineas, datos.totalCentimos)}
      <p style="margin:16px 0 0;line-height:1.5;">
        <strong>Transporte:</strong> ${datos.transporte === 'consolacion' ? 'Consolación (gratis)' : 'Mensajería urgente — hay que presupuestar y añadir la línea'}
      </p>
      ${datos.notas ? `<p style="margin:8px 0 0;line-height:1.5;"><strong>Nota:</strong> ${escapar(datos.notas)}</p>` : ''}
      <p style="margin:16px 0 0;color:#6b6a66;font-size:13px;">
        Está en Holded como borrador, pendiente de aprobar. Referencia interna:
        <code>${escapar(datos.idPedido)}</code>
      </p>
    `),
  })
}
