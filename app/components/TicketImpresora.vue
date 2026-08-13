<script setup lang="ts">
/**
 * Impresora de tiques: la máquina imprime el recibo del pedido delante de la
 * persona en vez de enseñarle una tarjeta ya hecha.
 *
 * El papel no se "revela": está de verdad fuera de la ventana (translateY de
 * -100%) y baja hasta su sitio. La ventana tiene overflow oculto, así que lo que
 * se ve es papel saliendo por la ranura. El avance va a tirones —empuja, para,
 * empuja— porque una impresora térmica saca el papel línea a línea; los tiempos
 * viven en el keyframe `mcm-imprimir` de main.css.
 *
 * Tres fases: procesando (pantalla girando, sin papel), imprimiendo (sale el
 * papel) y completado (check verde y confeti). Con `prefers-reduced-motion` se
 * salta directamente a completado.
 */
const props = withDefaults(defineProps<{ animar?: boolean }>(), { animar: true })

type Fase = 'procesando' | 'imprimiendo' | 'completado'
const fase = ref<Fase>('procesando')

const ETIQUETAS: Record<Fase, string> = {
  procesando: 'Procesando tu pedido',
  imprimiendo: 'Imprimiendo tu recibo',
  completado: 'Pedido completado',
}

/**
 * Los dientes del corte: 40 picos de 4px alternando entre el borde de abajo y
 * 4px más arriba. Se genera aquí porque a mano son 80 puntos de polígono.
 */
const DIENTES = 40
const PROFUNDIDAD = 4
const recorteDientes = (() => {
  const puntos = Array.from({ length: DIENTES * 2 }, (_, i) => {
    const x = 100 - ((i + 1) * 100) / (DIENTES * 2)
    const y = i % 2 === 0 ? '100%' : `calc(100% - ${PROFUNDIDAD}px)`
    return `${x}% ${y}`
  }).join(', ')
  return `polygon(0 0, 100% 0, 100% calc(100% - ${PROFUNDIDAD}px), ${puntos})`
})()

/** Confeti que sale de la ranura cuando el recibo termina de imprimirse. */
const CONFETI = Array.from({ length: 12 }, (_, i) => {
  const angulo = (i / 12) * 2 * Math.PI
  const radio = 70 + (i % 3) * 22
  return {
    x: Math.cos(angulo) * radio,
    y: Math.sin(angulo) * radio * 0.6,
    retraso: `${i * 45}ms`,
    color: ['bg-acento', 'bg-acento-alto', 'bg-aviso'][i % 3]!,
  }
})

let temporizadores: ReturnType<typeof setTimeout>[] = []

onMounted(() => {
  const sinMovimiento =
    !props.animar || window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (sinMovimiento) {
    fase.value = 'completado'
    return
  }

  // 700ms de "procesando" para que la impresora se vea trabajar, y el salto a
  // completado justo cuando el papel deja de moverse (1.75s de recorrido).
  temporizadores = [
    setTimeout(() => (fase.value = 'imprimiendo'), 700),
    setTimeout(() => (fase.value = 'completado'), 700 + 1750),
  ]
})

onBeforeUnmount(() => temporizadores.forEach(clearTimeout))
</script>

<template>
  <section
    class="relative mx-auto flex w-full max-w-sm flex-col items-center"
    aria-label="Recibo del pedido"
  >
    <!-- Cuerpo de la impresora -->
    <div class="mcm-impresora relative z-20 w-full rounded-2xl p-3 pb-7">
      <div class="flex h-9 items-center justify-between px-1">
        <span class="text-[10px] font-bold tracking-[0.2em] text-impresora-tinta/60 uppercase">
          Tienda MCM
        </span>
        <span class="flex gap-1" aria-hidden="true">
          <span class="size-1.5 rounded-full bg-impresora-tinta/25" />
          <span class="size-1.5 rounded-full bg-impresora-tinta/25" />
        </span>
      </div>

      <!-- Pantallita de estado -->
      <div class="mcm-pantalla flex items-center gap-2.5 rounded-xl p-3.5">
        <span class="relative grid size-5 shrink-0 place-items-center" aria-hidden="true">
          <svg
            v-if="fase === 'completado'"
            viewBox="0 0 24 24"
            class="size-5 text-acento"
            fill="currentColor"
          >
            <path
              d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.3-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7Z"
            />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            class="size-5 animate-spin text-impresora-tinta/55"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          >
            <path d="M12 3a9 9 0 1 0 9 9" />
          </svg>
        </span>
        <p
          class="min-w-0 flex-1 truncate text-xs font-medium text-impresora-tinta/75"
          role="status"
          aria-live="polite"
        >
          {{ ETIQUETAS[fase] }}
        </p>
      </div>

      <!-- La ranura por donde sale el papel -->
      <div class="absolute inset-x-6 bottom-3 h-2 rounded bg-ranura shadow-inner" aria-hidden="true" />
    </div>

    <!-- Ventana de salida: recorta el papel para que parezca que sale de dentro -->
    <div class="relative z-10 -mt-3 w-full overflow-hidden px-5">
      <div
        v-if="fase !== 'procesando'"
        class="pointer-events-none absolute inset-x-5 -top-1 z-20 h-2 bg-ranura/60 blur-[6px]"
        aria-hidden="true"
      />
      <div
        class="mcm-papel"
        :class="{
          'mcm-papel--imprimiendo': fase === 'imprimiendo',
          'mcm-papel--completado': fase === 'completado',
        }"
      >
        <article class="mcm-recibo px-6 pt-7 pb-9" :style="{ clipPath: recorteDientes }">
          <slot />
        </article>
      </div>
    </div>

    <!-- Fiesta al terminar de imprimir -->
    <div
      v-if="fase === 'completado'"
      class="pointer-events-none absolute inset-x-0 top-24 z-30 h-0"
      aria-hidden="true"
    >
      <span
        v-for="(c, i) in CONFETI"
        :key="i"
        class="mcm-confeti absolute size-1.5 rounded-full"
        :class="c.color"
        :style="{ '--tx': `${c.x}px`, '--ty': `${c.y}px`, animationDelay: c.retraso }"
      />
    </div>
  </section>
</template>
