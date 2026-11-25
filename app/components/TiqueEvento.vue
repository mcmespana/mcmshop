<script setup lang="ts">
import type { Tique } from '~/composables/useTiques'

/**
 * El tique que la persona enseña en el puesto desde su móvil.
 *
 * Está pensado para quien lo MIRA, no para quien lo tiene: alguien del equipo,
 * con prisa y con cola, que en dos segundos tiene que saber qué pedido es, qué
 * preparar y cuánto cobrar y cómo. Por eso, de arriba abajo: el número enorme,
 * el nombre, lo que se lleva, el total, y un sello que dice si está pagado o
 * hay que cobrarlo.
 *
 * Movimiento (excepción celebratoria documentada en design.md §7):
 *  1. se imprime: el papel sale a pasos de la impresora (TicketImpresora);
 *  2. al terminar, cae el sello de PAGADO o A COBRAR;
 *  3. y se queda una franja "en vivo" con la hora corriendo. Esa es la única
 *     animación permanente y tiene un trabajo: que se vea que es la pantalla
 *     de verdad y no una captura de la de otro.
 */
const props = defineProps<{ tique: Tique; imprimiendo?: boolean }>()

const ahora = ref<Date | null>(null)
let reloj: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  ahora.value = new Date()
  reloj = setInterval(() => (ahora.value = new Date()), 1000)
})
onBeforeUnmount(() => clearInterval(reloj))

const hora = computed(() =>
  ahora.value
    ? ahora.value.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '',
)

const hecho = computed(() =>
  new Date(props.tique.creadoEn).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }),
)

const unidades = computed(() => props.tique.lineas.reduce((s, l) => s + l.cantidad, 0))
const pagado = computed(() => props.tique.pago === 'tarjeta' && props.tique.estado === 'confirmado')
const esperando = computed(() => props.tique.estado === 'esperando-banco')

/**
 * Código de barras de adorno, sacado del número: cada carácter da tres barras
 * de grosor distinto. No se escanea —no hace falta—, pero hace que el tique se
 * lea como un tique de un vistazo, y cambia con cada pedido.
 */
const barras = computed(() => {
  const semilla = `${props.tique.numero ?? props.tique.clave}${props.tique.totalCentimos}`
  return [...semilla.slice(0, 14)].flatMap((c) => {
    const n = c.charCodeAt(0)
    return [1 + (n % 3), 1 + ((n >> 2) % 2), 1 + ((n >> 3) % 3)]
  })
})

const nombreEnPartes = computed(() => {
  // "Marta · Vila-real" o "Marta, Vila-real": el nombre grande, la localidad debajo.
  const [nombre, ...resto] = props.tique.nombre.split(/\s*[·,(]\s*/)
  return { nombre: nombre ?? props.tique.nombre, localidad: resto.join(' ').replace(/\)$/, '') }
})
</script>

<template>
  <TicketImpresora :imprimiendo="imprimiendo" compacto>
    <div class="relative text-left">
      <!-- Cabecera: de dónde es este tique -->
      <div class="flex items-center gap-2.5">
        <LogoMCM class="size-8 shrink-0" />
        <!-- pr: hueco para el sello, que cae en esta esquina -->
        <div class="min-w-0 pr-36 leading-tight">
          <p class="text-sm font-semibold text-balance">{{ tique.eventoNombre }}</p>
          <p class="text-xs text-muted-foreground">{{ tique.lugar ?? 'Tienda MCM' }}</p>
        </div>
      </div>

      <div class="mcm-tique-corte my-4" />

      <!-- El número: lo que se dice en voz alta en la cola -->
      <div class="text-center">
        <p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Pedido</p>
        <p v-if="tique.numero" class="mt-1 font-mono text-6xl leading-none font-bold tabular-nums">
          {{ tique.numero }}
        </p>
        <p
          v-else-if="esperando"
          class="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground"
          aria-live="polite"
        >
          <span
            class="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
            aria-hidden="true"
          />
          Confirmando con el banco…
        </p>
        <p v-else class="mt-1 font-mono text-4xl leading-none font-bold">—</p>

        <p class="mt-4 text-xl leading-tight font-semibold text-balance">{{ nombreEnPartes.nombre }}</p>
        <p v-if="nombreEnPartes.localidad" class="text-sm text-muted-foreground">
          {{ nombreEnPartes.localidad }}
        </p>
      </div>

      <div class="mcm-tique-corte my-4" />

      <!-- Lo que hay que preparar -->
      <ul class="space-y-2 text-sm">
        <li v-for="(l, i) in tique.lineas" :key="i" class="flex items-baseline gap-2">
          <span class="w-7 shrink-0 font-semibold tabular-nums">{{ l.cantidad }}×</span>
          <span class="min-w-0 flex-1">
            <span class="block font-medium">{{ l.nombre }}</span>
            <span v-if="l.variante" class="block text-muted-foreground">{{ l.variante }}</span>
            <!-- Para el equipo: esto no se da hoy, se avisa cuando llegue -->
            <span
              v-if="l.reserva"
              class="mt-0.5 inline-block rounded-sm bg-foreground px-1.5 py-px text-[10px] font-semibold tracking-wide text-card uppercase"
            >
              Reserva · no se entrega hoy
            </span>
          </span>
          <span class="shrink-0 tabular-nums">{{ formatearImporte(l.precioCentimos * l.cantidad) }}</span>
        </li>
      </ul>

      <div class="mcm-tique-corte my-4" />

      <div class="flex items-baseline justify-between gap-3">
        <span class="text-sm text-muted-foreground">
          Total · {{ unidades }} {{ unidades === 1 ? 'unidad' : 'unidades' }}
        </span>
        <span class="text-3xl font-bold tabular-nums">{{ formatearImporte(tique.totalCentimos) }}</span>
      </div>

      <!-- Cómo se paga -->
      <div class="mt-4 flex items-center gap-3 rounded-lg bg-background p-3">
        <IconoEfectivo v-if="tique.pago === 'efectivo'" class="size-10 shrink-0" />
        <IconoBizum v-else-if="tique.pago === 'bizum'" class="size-10 shrink-0" />
        <IconoTarjeta v-else class="size-10 shrink-0" />
        <div class="min-w-0 text-sm">
          <template v-if="tique.pago === 'efectivo'">
            <p class="font-semibold">Paga en efectivo</p>
            <p class="text-muted-foreground">En el puesto, al recogerlo.</p>
          </template>
          <template v-else-if="tique.pago === 'datafono'">
            <p class="font-semibold">Paga con tarjeta</p>
            <p class="text-muted-foreground">En el puesto, con el datáfono.</p>
          </template>
          <template v-else-if="tique.pago === 'bizum'">
            <p class="font-semibold">Paga con Bizum</p>
            <p class="text-muted-foreground">
              Donativos / ONG · código
              <strong class="font-mono font-semibold text-foreground">{{ CODIGO_BIZUM_ONG }}</strong>
            </p>
          </template>
          <template v-else-if="pagado">
            <p class="font-semibold">Pagado con tarjeta</p>
            <p class="text-muted-foreground">No hay que cobrar nada.</p>
          </template>
          <template v-else-if="tique.estado === 'rechazado'">
            <p class="font-semibold text-warn">El banco no ha aceptado el pago</p>
            <p class="text-muted-foreground">Págalo en el puesto en efectivo o con Bizum.</p>
          </template>
          <template v-else>
            <p class="font-semibold">Pago con tarjeta</p>
            <p class="text-muted-foreground">Esperando la confirmación del banco.</p>
          </template>
        </div>
      </div>

      <!-- Código de barras de adorno y hora del pedido -->
      <div class="mt-5 flex flex-col items-center gap-1.5" aria-hidden="true">
        <div class="flex h-10 items-stretch gap-[2px]">
          <span
            v-for="(ancho, i) in barras"
            :key="i"
            class="bg-foreground"
            :style="{ width: `${ancho}px`, opacity: i % 4 === 3 ? 0 : 1 }"
          />
        </div>
        <p class="font-mono text-[0.75rem] tracking-[0.2em] text-muted-foreground">
          {{ (tique.numero ?? '').padStart(3, '0') }} · {{ hecho }}
        </p>
      </div>

      <!-- Sello: lo primero que mira quien cobra -->
      <div
        v-if="!esperando"
        class="mcm-tique-sello pointer-events-none absolute -top-1 -right-1"
        :class="pagado ? 'mcm-tique-sello-pagado' : 'mcm-tique-sello-cobrar'"
      >
        {{ pagado ? 'Pagado' : tique.estado === 'rechazado' ? 'Sin pagar' : 'A cobrar' }}
      </div>
    </div>

    <!-- Franja en vivo: la hora corre, así que no es una captura -->
    <div class="mcm-tique-vivo -mx-5 mt-5 -mb-5 flex items-center justify-center gap-2 py-2 text-xs font-medium">
      <span class="relative flex size-2" aria-hidden="true">
        <span class="mcm-evento-latido absolute inline-flex size-full rounded-full bg-primary-foreground" />
        <span class="relative inline-flex size-2 rounded-full bg-primary-foreground" />
      </span>
      <span>En vivo</span>
      <span class="font-mono tabular-nums">{{ hora }}</span>
    </div>
  </TicketImpresora>
</template>
