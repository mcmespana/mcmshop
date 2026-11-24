<script setup lang="ts">
import type { Evento } from '~~/shared/utils/eventos'

/**
 * La puerta al modo evento en la bienvenida: "Estoy en el Congreso de Monitores".
 *
 * Tiene forma de entrada de evento —cuerpo y matriz troquelada— porque es justo
 * lo que es: la entrada a comprar en el puesto. Va más grande y más arriba que
 * las otras dos opciones porque, mientras dura el evento, es la que busca casi
 * todo el que abre la tienda allí.
 *
 * Movimiento, y por qué (design.md §3.4):
 *  - entra como las demás tarjetas, en cascada, para no romper el ritmo;
 *  - la matriz con las fechas "se sella" un instante después: dice que esto es
 *    distinto de las otras dos opciones sin tener que escribirlo;
 *  - un brillo cruza la tarjeta UNA vez al llegar, y otra al pasar el ratón;
 *  - el punto de "En marcha" late sólo mientras el evento está pasando de
 *    verdad: es la única animación en bucle, y dice algo que es cierto ahora.
 */
const props = defineProps<{ evento: Evento; retraso?: number }>()
defineEmits<{ elegir: [] }>()

const enCurso = computed(() => eventoEnCurso(props.evento))
const fechas = computed(() => textoFechas(props.evento))

/** "27–29" arriba y "nov" debajo en la matriz; si cruza de mes, todo arriba. */
const matriz = computed(() => {
  const partes = fechas.value.split(' ')
  return partes.length === 2 ? { dias: partes[0]!, mes: partes[1]! } : { dias: fechas.value, mes: '' }
})
</script>

<template>
  <button
    type="button"
    class="mcm-animar-entrada mcm-evento group relative flex w-full overflow-hidden rounded-xl text-left"
    :style="{ animationDelay: `${retraso ?? 0}ms` }"
    :aria-label="`Estoy en el ${evento.nombre}${evento.lugar ? `, ${evento.lugar}` : ''}, ${fechas}. Pedir para recoger en el puesto.`"
    @click="$emit('elegir')"
  >
    <!-- Cuerpo de la entrada -->
    <span class="relative min-w-0 flex-1 p-5 pr-4">
      <span class="flex items-center gap-2 text-xs font-semibold tracking-wide text-primary uppercase">
        <span class="relative flex size-2" aria-hidden="true">
          <span
            v-if="enCurso"
            class="mcm-evento-latido absolute inline-flex size-full rounded-full bg-primary"
          />
          <span class="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        {{ enCurso ? 'En marcha' : 'Próximamente' }}
      </span>

      <span class="mt-3 block text-sm text-muted-foreground">Estoy en el</span>
      <span class="block text-2xl leading-tight font-semibold text-balance">
        {{ evento.nombre }}
      </span>

      <span v-if="evento.lugar" class="mt-3 flex items-center gap-1.5 text-sm">
        <svg viewBox="0 0 24 24" class="size-4 text-primary" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {{ evento.lugar }}
      </span>

      <span class="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary">
        Pide aquí y recógelo en el puesto
        <svg viewBox="0 0 24 24" class="size-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
        </svg>
      </span>
    </span>

    <!-- Matriz troquelada con las fechas -->
    <span
      class="mcm-evento-matriz relative flex w-24 shrink-0 flex-col items-center justify-center text-primary-foreground"
      :style="{ animationDelay: `${(retraso ?? 0) + 260}ms` }"
      aria-hidden="true"
    >
      <span class="text-2xl leading-none font-bold tabular-nums">{{ matriz.dias }}</span>
      <span v-if="matriz.mes" class="mt-1 text-xs font-semibold tracking-wide uppercase">
        {{ matriz.mes }}
      </span>
    </span>

    <!-- Brillo que cruza una vez al llegar -->
    <span
      class="mcm-evento-brillo pointer-events-none absolute inset-y-0 -left-1/3 w-1/3"
      :style="{ animationDelay: `${(retraso ?? 0) + 520}ms` }"
      aria-hidden="true"
    />
  </button>
</template>
