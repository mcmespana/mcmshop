/**
 * Datos de contacto del equipo. Viven aquí, en un solo sitio, porque aparecen en
 * varias pantallas: instrucciones de pago, confirmación, pie de página y la
 * pantalla de "algo ha ido mal".
 *
 * Los datos de cobro (Bizum, IBAN) están en `shared/utils/pago.ts`: los usan
 * también los correos, que se montan en el servidor.
 */

export const TELEFONO_CONTACTO = '649949583'
export const EMAIL_CONTACTO = 'ajmcm@movimientoconsolacion.com'

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
