/**
 * Eventos presenciales: los días en que se vende en un puesto, en mano.
 *
 * ── CÓMO DAR DE ALTA UN EVENTO ───────────────────────────────────────────────
 *
 * Añade un bloque a la lista de abajo y guarda (en GitHub vale editar este
 * fichero desde el navegador: al guardar en `main`, Vercel lo publica solo en
 * un par de minutos).
 *
 *   {
 *     id: 'pascua-27',              // va en el enlace: tienda…/evento/pascua-27
 *     nombre: 'Pascua MCM 2027',    // lo que se ve en la tienda y en Holded
 *     desde: '2027-03-25',          // primer día (incluido)
 *     hasta: '2027-03-30',          // último día (incluido)
 *   },
 *
 * Fuera de esas fechas el evento no hace nada: no hace falta borrarlo.
 *
 * ── CÓMO SE USA EN EL EVENTO ─────────────────────────────────────────────────
 *
 * Abre (o pon en un QR en el puesto) `https://tienda.movimientoconsolacion.com/evento/<id>`.
 * Ese móvil o tablet queda en modo evento hasta que acabe: se pide sólo el
 * nombre, no hay envío (se entrega en mano) y se paga en efectivo, Bizum o
 * tarjeta. El pedido entra en Holded con el tag `evento` y el del evento.
 *
 * El resto de la gente que compra online no ve nada de esto, salvo que pongas
 * `paraTodos: true` (entonces cualquiera que entre en esas fechas lo ve).
 */

export interface Evento {
  /** Minúsculas, números y guiones. Sale en el enlace y en el tag de Holded. */
  id: string
  nombre: string
  /** Primer día, "AAAA-MM-DD", hora de España. */
  desde: string
  /** Último día, incluido. */
  hasta: string
  /** Si es true, el modo evento sale a todo el que entre esos días, sin enlace. */
  paraTodos?: boolean
}

export const EVENTOS: Evento[] = [
  {
    id: 'evento-diciembre-26',
    nombre: 'Evento presencial MCM',
    desde: '2026-11-26',
    hasta: '2026-12-01',
  },
]

/** Hoy en España, como "AAAA-MM-DD". El servidor de Vercel vive en UTC. */
export function hoyEnEspana(ahora: Date = new Date()): string {
  // en-CA formatea como AAAA-MM-DD, que se compara bien como texto.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(ahora)
}

function enFechas(evento: Evento, hoy: string): boolean {
  return evento.desde <= hoy && hoy <= evento.hasta
}

/** El evento con ese id, sólo si hoy está en sus fechas. */
export function eventoActivo(id: string | null | undefined, ahora?: Date): Evento | null {
  if (!id) return null
  const evento = EVENTOS.find((e) => e.id === id)
  return evento && enFechas(evento, hoyEnEspana(ahora)) ? evento : null
}

/** Un evento abierto a todo el mundo que esté hoy en fechas, si lo hay. */
export function eventoParaTodos(ahora?: Date): Evento | null {
  const hoy = hoyEnEspana(ahora)
  return EVENTOS.find((e) => e.paraTodos && enFechas(e, hoy)) ?? null
}
