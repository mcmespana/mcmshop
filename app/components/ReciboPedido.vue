<script setup lang="ts">
import type { LineaCarrito } from '~/composables/useCarrito'

/**
 * El contenido del tique, pensado para leerse como un recibo de caja de verdad:
 * monoespaciada, cuerpos diminutos, separadores de puntos y el contacto en el
 * pie, que es donde uno lo busca cuando tiene un problema con una compra.
 *
 * Las líneas del pedido son opcionales: si alguien recarga /pago/ok el carrito
 * ya está vacío, y entonces el recibo enseña el total y la referencia sin el
 * desglose en vez de romperse.
 */
const props = withDefaults(
  defineProps<{
    lineas?: LineaCarrito[]
    totalCentimos: number
    referencia?: string | null
    metodoPago: 'bizum' | 'transferencia' | 'tarjeta'
    /** Null cuando la pantalla no lo sabe (la vuelta de Redsys, por ejemplo). */
    transporte?: 'consolacion' | 'mensajeria' | null
    sello: string
  }>(),
  { lineas: () => [], referencia: null, transporte: null },
)

const NOMBRE_PAGO: Record<typeof props.metodoPago, string> = {
  bizum: 'Bizum ONG',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
}

const unidades = computed(() => props.lineas.reduce((s, l) => s + l.cantidad, 0))

/** Referencia corta para el código de barras; la larga va en el desglose. */
const referenciaCorta = computed(() =>
  (props.referencia ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase(),
)

/**
 * La fecha se rellena ya en el navegador: si se calculara al renderizar en el
 * servidor, la hora del servidor y la del cliente no coincidirían e hidratar
 * daría un aviso.
 */
const fecha = ref('')
onMounted(() => {
  const ahora = new Date()
  const dia = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(ahora)
  const hora = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(ahora)
  fecha.value = `${dia.replace('.', '').toUpperCase()} · ${hora}`
})
</script>

<template>
  <div>
    <header class="text-center">
      <p class="text-sm font-bold tracking-[0.22em] uppercase">Tienda MCM</p>
      <p class="mt-1 text-[8px] leading-3 tracking-[0.1em] uppercase opacity-55">
        Movimiento Consolación<br />para el Mundo
      </p>
    </header>

    <div class="my-5 border-t border-dashed border-current/25" />

    <!-- Desglose del pedido -->
    <ul v-if="lineas.length" class="space-y-2.5">
      <li v-for="l in lineas" :key="l.clave" class="flex items-start justify-between gap-3">
        <span class="min-w-0">
          <span class="block text-[9px] leading-4 font-bold tracking-[0.06em] uppercase">
            {{ l.cantidad }} × {{ l.nombre }}
          </span>
          <span v-if="l.variante" class="block text-[8px] leading-3 opacity-55">
            {{ l.variante }}
          </span>
        </span>
        <span class="shrink-0 text-[9px] leading-4 font-bold">
          {{ formatearEuros(l.precioCentimos * l.cantidad) }}
        </span>
      </li>
    </ul>

    <div v-if="lineas.length" class="my-4 border-t border-dashed border-current/20" />

    <dl class="space-y-1.5 text-[9px] leading-none">
      <div v-if="lineas.length" class="flex justify-between gap-4">
        <dt class="opacity-55">Artículos</dt>
        <dd>{{ unidades }}</dd>
      </div>
      <div v-if="transporte" class="flex justify-between gap-4">
        <dt class="opacity-55">Envío</dt>
        <dd>{{ transporte === 'consolacion' ? 'Gratis' : 'A confirmar' }}</dd>
      </div>
      <div class="flex items-end justify-between gap-4 pt-2 font-bold">
        <dt class="text-[10px] tracking-[0.08em] uppercase">Total</dt>
        <dd class="text-[15px] tracking-[-0.04em]">{{ formatearEuros(totalCentimos) }}</dd>
      </div>
    </dl>

    <div class="my-4 border-t border-dashed border-current/20" />

    <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[8px] leading-3">
      <span class="opacity-55">Pedido</span>
      <span class="break-all">{{ referencia ?? '—' }}</span>
      <span class="opacity-55">Fecha</span>
      <span>{{ fecha || '—' }}</span>
      <span class="opacity-55">Pago</span>
      <span>{{ NOMBRE_PAGO[metodoPago] }}</span>
      <template v-if="transporte">
        <span class="opacity-55">Envío</span>
        <span>{{ transporte === 'consolacion' ? 'Transporte Consolación' : 'Mensajería' }}</span>
      </template>
    </div>

    <div class="my-4 border-t border-dashed border-current/20" />

    <p class="text-center text-[10px] leading-4 font-bold tracking-[0.12em] uppercase">
      ¡Gracias por tu pedido!
    </p>
    <p class="mt-1 text-center text-[8px] leading-3 opacity-55">
      Te hemos mandado un correo con todo el detalle
    </p>

    <!-- El sello, torcido como el que se estampa a mano al cerrar la caja -->
    <p class="mt-4 text-center">
      <span
        class="inline-block rotate-[-7deg] rounded border-2 border-acento/45 px-2.5 py-1 text-[11px] font-bold tracking-[0.16em] text-acento/70 uppercase"
      >
        {{ sello }}
      </span>
    </p>

    <div class="my-4 border-t border-dashed border-current/20" />

    <!--
      El contacto va en el pie, que es donde se mira cuando algo va mal. Impreso
      pero pulsable: en el móvil abrir el WhatsApp de un toque vale más que la
      pureza tipográfica del tique.
    -->
    <div class="text-center text-[8px] leading-3">
      <p class="font-bold tracking-[0.12em] uppercase opacity-70">¿Necesitas algo?</p>
      <p class="mt-1 opacity-55">
        <a
          :href="enlaceWhatsapp('Hola, tengo una duda sobre un pedido en la Tienda MCM.')"
          target="_blank"
          rel="noopener"
          class="underline-offset-2 hover:underline"
        >
          {{ telefonoFormateado() }}
        </a>
        ·
        <a :href="enlaceCorreo()" class="underline-offset-2 hover:underline">
          {{ EMAIL_CONTACTO }}
        </a>
      </p>
    </div>

    <div class="mt-5 text-center">
      <div class="mcm-codigo-barras mx-auto h-7 w-32" aria-hidden="true" />
      <p class="mt-1 text-[7px] tracking-[0.18em] opacity-50">
        {{ referenciaCorta || 'MCM' }}
      </p>
    </div>
  </div>
</template>
