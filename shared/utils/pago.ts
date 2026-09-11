/**
 * Datos de cobro del equipo.
 *
 * Viven en `shared/` porque los necesitan los dos lados: las pantallas de
 * confirmación y también los correos que se montan en el servidor. Tener el
 * código de Bizum escrito en dos sitios es justo la forma de que un día el
 * correo diga uno y la pantalla otro.
 */

export const CODIGO_BIZUM_ONG = '09038'
export const IBAN_TRANSFERENCIA = 'ES07 0081 5240 0000 0324 5534'

/** Plazo que prometemos para escribir a quien paga por transferencia. */
export const HORAS_RESPUESTA_TRANSFERENCIA = 48
