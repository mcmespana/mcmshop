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
 *     id: 'pascua-27',              // va en el enlace y en el tag de Holded
 *     nombre: 'Pascua MCM 2027',    // lo que se ve en la tienda y en Holded
 *     lugar: 'Caravaca',            // opcional
 *     desde: '2027-03-25',          // primer día del evento (incluido)
 *     hasta: '2027-03-30',          // último día (incluido)
 *     publicarDesde: '2027-03-20',  // opcional: desde cuándo se ve en la tienda
 *     datafono: true,               // opcional: hay datáfono físico en el puesto
 *   },
 *
 * Mientras está publicado (de `publicarDesde`, o `desde` si no se pone, hasta
 * `hasta`):
 *   - sale destacado arriba del todo en la pantalla de bienvenida,
 *   - y en el TPV se puede elegir para apuntar las ventas del puesto.
 * Pasado `hasta` se apaga solo: no hace falta borrarlo.
 *
 * También se puede entrar por enlace o QR: `https://tienda.movimientoconsolacion.com/evento/<id>`.
 */

export interface Evento {
  /** Minúsculas, números y guiones. Sale en el enlace y en el tag de Holded. */
  id: string
  nombre: string
  /** Población o sitio, para la tarjeta de bienvenida y el tique. */
  lugar?: string
  /** Primer día del evento, "AAAA-MM-DD", hora de España. */
  desde: string
  /** Último día, incluido. */
  hasta: string
  /**
   * Desde cuándo se ve en la tienda, si es antes de que empiece: para poder
   * probarlo, o para que la gente pida antes y lo recoja allí.
   */
  publicarDesde?: string
  /**
   * Si en el puesto hay datáfono físico. Entonces, en el móvil de cada persona,
   * "Tarjeta" significa pagar en el puesto con el datáfono y no online por
   * Redsys: con la cola delante es más rápido pasar la tarjeta que ir al banco.
   */
  datafono?: boolean
}

export const EVENTOS: Evento[] = [
  {
    id: 'congreso-monitores-26',
    nombre: 'Congreso de Monitores',
    lugar: 'Benicàssim',
    desde: '2026-11-27',
    hasta: '2026-11-29',
    publicarDesde: '2026-11-24',
    datafono: true,
  },
]

/** Hoy en España, como "AAAA-MM-DD". El servidor de Vercel vive en UTC. */
export function hoyEnEspana(ahora: Date = new Date()): string {
  // en-CA formatea como AAAA-MM-DD, que se compara bien como texto.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(ahora)
}

function publicado(evento: Evento, hoy: string): boolean {
  return (evento.publicarDesde ?? evento.desde) <= hoy && hoy <= evento.hasta
}

/** El evento con ese id, sólo si hoy está publicado. */
export function eventoActivo(id: string | null | undefined, ahora?: Date): Evento | null {
  if (!id) return null
  const evento = EVENTOS.find((e) => e.id === id)
  return evento && publicado(evento, hoyEnEspana(ahora)) ? evento : null
}

/** Todos los eventos publicados hoy, el más próximo primero. */
export function eventosPublicados(ahora?: Date): Evento[] {
  const hoy = hoyEnEspana(ahora)
  return EVENTOS.filter((e) => publicado(e, hoy)).sort((a, b) => a.desde.localeCompare(b.desde))
}

/** ¿Está pasando ahora mismo, o sólo anunciado? Cambia el texto de la tarjeta. */
export function eventoEnCurso(evento: Evento, ahora?: Date): boolean {
  const hoy = hoyEnEspana(ahora)
  return evento.desde <= hoy && hoy <= evento.hasta
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * "27–29 nov", "30 nov – 2 dic" o "27 nov". Corto a propósito: va en una
 * tarjeta de móvil y en un tique, donde "del 27 al 29 de noviembre" no cabe.
 */
export function textoFechas(evento: Evento): string {
  const [, m1, d1] = evento.desde.split('-').map(Number) as [number, number, number]
  const [, m2, d2] = evento.hasta.split('-').map(Number) as [number, number, number]
  if (evento.desde === evento.hasta) return `${d1} ${MESES[m1 - 1]}`
  if (m1 === m2) return `${d1}–${d2} ${MESES[m1 - 1]}`
  return `${d1} ${MESES[m1 - 1]} – ${d2} ${MESES[m2 - 1]}`
}
