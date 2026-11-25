/**
 * Tiques de las compras hechas en un evento, guardados en este móvil.
 *
 * La pantalla del tique es lo que la persona enseña en el puesto, a veces un
 * buen rato después de pedir y con la pestaña cerrada entre medias. Si viviera
 * sólo en la memoria de la página, recargar sería perder el pedido delante de
 * la cola. Así que se guarda aquí, y `/tique` lo vuelve a pintar.
 *
 * Es una copia para enseñar, no la fuente de verdad: el pedido de verdad está
 * en Holded, con el mismo número en la descripción.
 */

export interface LineaTique {
  nombre: string
  variante: string | null
  cantidad: number
  precioCentimos: number
  /** Reservado: no está en el puesto, no se entrega hoy. */
  reserva?: boolean
}

/** `tarjeta` es online por Redsys; `datafono`, la tarjeta pasada en el puesto. */
export type PagoTique = 'efectivo' | 'bizum' | 'tarjeta' | 'datafono'

export interface Tique {
  /** Número corto del pedido; null mientras el banco no confirma un pago con tarjeta. */
  numero: string | null
  eventoId: string
  eventoNombre: string
  lugar: string | null
  nombre: string
  lineas: LineaTique[]
  totalCentimos: number
  pago: PagoTique
  /** `esperando-banco` sólo existe con tarjeta, entre que se va a Redsys y vuelve. */
  estado: 'confirmado' | 'esperando-banco' | 'rechazado'
  creadoEn: string
  /** Número de pedido de Redsys, para preguntar si ya está cobrado. */
  pagoRedsys?: string
  /** Clave local, para encontrarlo aunque todavía no tenga número. */
  clave: string
}

const CLAVE = 'mcm_tiques_v1'
const MAXIMO = 30

export function useTiques() {
  const tiques = useState<Tique[]>('tiques', () => [])
  const cargados = useState<boolean>('tiques-cargados', () => false)

  function cargar() {
    if (!import.meta.client || cargados.value) return
    try {
      const crudo = localStorage.getItem(CLAVE)
      tiques.value = crudo ? (JSON.parse(crudo) as Tique[]) : []
    } catch {
      // Navegación privada o datos corruptos: se empieza de cero sin romper nada.
      tiques.value = []
    }
    cargados.value = true
  }

  function persistir() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(tiques.value.slice(0, MAXIMO)))
    } catch {
      // Sin almacenamiento el tique se ve igual en esta visita; sólo no sobrevive a recargar.
    }
  }

  function guardar(tique: Tique) {
    cargar()
    tiques.value = [tique, ...tiques.value.filter((t) => t.clave !== tique.clave)].slice(0, MAXIMO)
    persistir()
  }

  function actualizar(clave: string, cambios: Partial<Tique>) {
    cargar()
    tiques.value = tiques.value.map((t) => (t.clave === clave ? { ...t, ...cambios } : t))
    persistir()
  }

  function buscar(clave: string | null | undefined): Tique | null {
    if (!clave) return null
    return tiques.value.find((t) => t.clave === clave) ?? null
  }

  return { tiques, cargar, guardar, actualizar, buscar }
}
