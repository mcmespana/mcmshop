import { tpvLibre } from '../utils/tpv'

/**
 * Comprobación rápida de que la tienda está bien montada, para el equipo:
 * abrir `/api/salud` y ver si Redis está conectado y cómo se numeran los
 * pedidos de los eventos.
 *
 * No dice nada secreto: ni claves ni direcciones, sólo sí o no.
 */
export default defineEventHandler(() => {
  const compartido = useStorage().getMount('contadores').driver.name === 'upstash'
  return {
    almacenCompartido: compartido,
    numeracionEventos: compartido ? 'correlativa (001, 002, 003…)' : 'código aleatorio (sin Redis)',
    tpv: tpvLibre() ? 'abierto sin clave' : 'con clave',
  }
})
