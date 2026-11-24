import type { ProductoCatalogo, VarianteCatalogo } from '~~/server/utils/catalogo'

/**
 * Estado de la venta que se está apuntando en el TPV, compartido entre la
 * rejilla de productos y el panel del ticket (que en ordenador es una columna
 * y en móvil una hoja inferior: el mismo estado, dos sitios).
 *
 * Todo está pensado para encadenar ventas: al registrar una, el ticket se
 * vacía y vuelve a los valores por defecto (efectivo, se lo lleva), pero el
 * evento y el canal se quedan, porque son de la sesión de trabajo, no de la
 * persona que compra.
 */

export interface LineaTpv {
  clave: string
  productoId: string
  varianteId: string | null
  nombre: string
  variante: string | null
  precioCentimos: number
  cantidad: number
  /** Stock al añadirla. Si se pide más, la venta pasa a reservada. */
  stock: number
}

export type PagoTpv = 'efectivo' | 'bizum' | 'tarjeta' | 'pendiente'
export type EntregaTpv = 'entregado' | 'reservado'

/** Lo que queda en este dispositivo de cada venta, para cuadrar la caja al final. */
export interface VentaLocal {
  numero: string
  nombre: string
  totalCentimos: number
  pago: PagoTpv
  entrega: EntregaTpv
  evento: string | null
  hora: string
  unidades: number
}

const CLAVE_VENTAS = 'mcm_tpv_ventas_v1'
const CLAVE_EVENTO = 'mcm_tpv_evento'

export function useVentaTpv() {
  const lineas = useState<LineaTpv[]>('tpv-lineas', () => [])
  const nombre = useState('tpv-nombre', () => '')
  const email = useState('tpv-email', () => '')
  const telefono = useState('tpv-telefono', () => '')
  const delegacionId = useState('tpv-delegacion', () => '')
  const notas = useState('tpv-notas', () => '')
  const pago = useState<PagoTpv>('tpv-pago', () => 'efectivo')
  const entrega = useState<EntregaTpv>('tpv-entrega', () => 'entregado')
  /** '' = venta suelta, sin evento. */
  const eventoId = useState('tpv-evento', () => '')
  const canal = useState<'telefono' | 'otro'>('tpv-canal', () => 'telefono')
  const ventas = useState<VentaLocal[]>('tpv-ventas', () => [])
  /** Último producto al que se ha sumado algo: su contador da un saltito. */
  const ultimoSumado = useState<{ id: string; vez: number } | null>('tpv-ultimo', () => null)

  const claveIdempotencia = useState('tpv-idem', () => '')
  const registrando = useState('tpv-registrando', () => false)
  const error = useState<string | null>('tpv-error', () => null)
  const hecho = useState<{ numero: string; nombre: string; totalCentimos: number } | null>(
    'tpv-hecho',
    () => null,
  )

  const totalCentimos = computed(() =>
    lineas.value.reduce((s, l) => s + l.precioCentimos * l.cantidad, 0),
  )
  const unidades = computed(() => lineas.value.reduce((s, l) => s + l.cantidad, 0))
  const faltaStock = computed(() => lineas.value.some((l) => l.cantidad > l.stock))

  function enTicket(productoId: string): number {
    return lineas.value.filter((l) => l.productoId === productoId).reduce((s, l) => s + l.cantidad, 0)
  }

  function anadir(producto: ProductoCatalogo, variante: VarianteCatalogo | null) {
    const clave = `${producto.id}#${variante?.id ?? ''}`
    const existente = lineas.value.find((l) => l.clave === clave)
    if (existente) {
      existente.cantidad++
    } else {
      lineas.value.push({
        clave,
        productoId: producto.id,
        varianteId: variante?.id ?? null,
        nombre: producto.nombre,
        variante: variante?.etiqueta ?? null,
        precioCentimos: variante?.precioCentimos ?? producto.precioCentimos,
        cantidad: 1,
        stock: variante?.stock ?? producto.stock,
      })
    }
    ultimoSumado.value = { id: producto.id, vez: (ultimoSumado.value?.vez ?? 0) + 1 }
    // Si lo que se pide no está, la venta no puede ser "se lo lleva".
    if (faltaStock.value) entrega.value = 'reservado'
    error.value = null
  }

  function cambiarCantidad(clave: string, delta: number) {
    const linea = lineas.value.find((l) => l.clave === clave)
    if (!linea) return
    linea.cantidad += delta
    if (linea.cantidad <= 0) lineas.value = lineas.value.filter((l) => l.clave !== clave)
    if (faltaStock.value) entrega.value = 'reservado'
  }

  function vaciar() {
    lineas.value = []
    nombre.value = ''
    email.value = ''
    telefono.value = ''
    delegacionId.value = ''
    notas.value = ''
    pago.value = 'efectivo'
    entrega.value = 'entregado'
    error.value = null
    claveIdempotencia.value = crypto.randomUUID()
  }

  // ── Persistencia local: evento elegido y ventas del dispositivo ──────────────

  function cargarLocal() {
    try {
      ventas.value = JSON.parse(localStorage.getItem(CLAVE_VENTAS) ?? '[]') as VentaLocal[]
    } catch {
      ventas.value = []
    }
    const publicados = eventosPublicados()
    let guardado: string | null = null
    try {
      guardado = localStorage.getItem(CLAVE_EVENTO)
    } catch {
      // Sin almacenamiento se elige el evento por defecto cada vez.
    }
    eventoId.value =
      guardado !== null && (guardado === '' || publicados.some((e) => e.id === guardado))
        ? guardado
        : (publicados[0]?.id ?? '')
    if (!claveIdempotencia.value) claveIdempotencia.value = crypto.randomUUID()
  }

  watch(eventoId, (v) => {
    try {
      localStorage.setItem(CLAVE_EVENTO, v)
    } catch {
      // No pasa nada: se recuerda mientras la página siga abierta.
    }
  })

  function apuntarVenta(venta: VentaLocal) {
    ventas.value = [venta, ...ventas.value].slice(0, 500)
    try {
      localStorage.setItem(CLAVE_VENTAS, JSON.stringify(ventas.value))
    } catch {
      // Sin almacenamiento la venta está igual en Holded; sólo falta aquí.
    }
  }

  // ── Registrar ────────────────────────────────────────────────────────────────

  let temporizadorHecho: ReturnType<typeof setTimeout> | undefined

  async function registrar(): Promise<boolean> {
    if (registrando.value || lineas.value.length === 0) return false
    registrando.value = true
    error.value = null

    try {
      const respuesta = await $fetch('/api/tpv/pedidos', {
        method: 'POST',
        body: {
          claveIdempotencia: claveIdempotencia.value,
          evento: eventoId.value || undefined,
          canal: eventoId.value ? 'evento' : canal.value,
          lineas: lineas.value.map((l) => ({
            productoId: l.productoId,
            varianteId: l.varianteId,
            cantidad: l.cantidad,
          })),
          cliente: {
            nombre: nombre.value.trim() || undefined,
            email: email.value.trim() || undefined,
            telefono: telefono.value.trim() || undefined,
            delegacionId: delegacionId.value || undefined,
          },
          pago: pago.value,
          entrega: entrega.value,
          notas: notas.value.trim() || undefined,
        },
      })

      apuntarVenta({
        numero: respuesta.numero,
        nombre: nombre.value.trim() || 'Sin nombre',
        totalCentimos: respuesta.totalCentimos,
        pago: pago.value,
        entrega: entrega.value,
        evento: eventoId.value || null,
        hora: new Date().toISOString(),
        unidades: unidades.value,
      })

      hecho.value = {
        numero: respuesta.numero,
        nombre: nombre.value.trim(),
        totalCentimos: respuesta.totalCentimos,
      }
      clearTimeout(temporizadorHecho)
      temporizadorHecho = setTimeout(() => (hecho.value = null), 1600)

      vaciar()
      return true
    } catch (e) {
      const fallo = e as { statusCode?: number; statusMessage?: string }
      error.value =
        fallo.statusMessage ??
        'No se ha podido registrar. Revisa la conexión y vuelve a pulsar: no se apuntará dos veces.'
      if (fallo.statusCode === 401) refreshNuxtData('tpv-sesion')
      return false
    } finally {
      registrando.value = false
    }
  }

  return {
    lineas,
    nombre,
    email,
    telefono,
    delegacionId,
    notas,
    pago,
    entrega,
    eventoId,
    canal,
    ventas,
    ultimoSumado,
    registrando,
    error,
    hecho,
    totalCentimos,
    unidades,
    faltaStock,
    enTicket,
    anadir,
    cambiarCantidad,
    vaciar,
    cargarLocal,
    registrar,
  }
}
