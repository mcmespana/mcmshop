/**
 * Datos de contacto y cuentas de cobro del equipo. Viven aquí, en un solo sitio,
 * porque aparecen en varias pantallas: instrucciones de pago, confirmación,
 * pie de página y la pantalla de "algo ha ido mal".
 */

export const TELEFONO_CONTACTO = '649949583'
export const EMAIL_CONTACTO = 'ajmcm@movimientoconsolacion.com'

export const CODIGO_BIZUM_ONG = '09038'
export const IBAN_TRANSFERENCIA = 'ES07 0081 5240 0000 0324 5534'

/** Enlace de WhatsApp con un mensaje ya escrito, listo para pulsar y enviar. */
export function enlaceWhatsapp(mensaje?: string): string {
  const numero = `34${TELEFONO_CONTACTO}`
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''
  return `https://wa.me/${numero}${texto}`
}

export function enlaceCorreo(asunto?: string): string {
  const query = asunto ? `?subject=${encodeURIComponent(asunto)}` : ''
  return `mailto:${EMAIL_CONTACTO}${query}`
}

/** Teléfono con espacios para que se lea bien: "649 94 95 83". */
export function telefonoFormateado(): string {
  return TELEFONO_CONTACTO.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4')
}
