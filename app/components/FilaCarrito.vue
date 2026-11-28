<script setup lang="ts">
import type { LineaCarrito } from '~/composables/useCarrito'

const props = defineProps<{ linea: LineaCarrito }>()
defineEmits<{ cambiar: [cantidad: number]; quitar: [] }>()

const { evento } = useEvento()
const verPrecio = computed(() => !props.linea.sinPrecio || !!evento.value)
const subtotal = computed(() => props.linea.precioCentimos * props.linea.cantidad)
</script>

<template>
  <li class="flex gap-3 px-4 py-3">
    <NuxtImg
      v-if="linea.imagen"
      :src="linea.imagen"
      :alt="linea.nombre"
      width="48"
      height="48"
      format="webp"
      class="size-12 shrink-0 rounded-md object-cover"
    />

    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium">{{ linea.nombre }}</p>
      <p v-if="linea.variante || linea.reserva" class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          v-if="linea.reserva"
          class="shrink-0 rounded-sm bg-foreground px-1.5 py-px text-[10px] font-semibold tracking-wide text-card uppercase"
        >
          Reserva
        </span>
        <span v-if="linea.variante" class="truncate">{{ linea.variante }}</span>
      </p>

      <div class="mt-1.5 flex items-center gap-2">
        <div class="flex items-center rounded-md border border-border">
          <button
            type="button"
            class="px-2 py-0.5 text-xs text-muted-foreground transition hover:text-foreground"
            aria-label="Quitar una unidad"
            @click="$emit('cambiar', linea.cantidad - 1)"
          >
            −
          </button>
          <span class="w-6 text-center text-xs tabular-nums">{{ linea.cantidad }}</span>
          <button
            type="button"
            class="px-2 py-0.5 text-xs text-muted-foreground transition hover:text-foreground"
            aria-label="Añadir una unidad"
            @click="$emit('cambiar', linea.cantidad + 1)"
          >
            +
          </button>
        </div>

        <button
          type="button"
          class="text-xs text-muted-foreground underline-offset-2 transition hover:text-warn hover:underline"
          @click="$emit('quitar')"
        >
          Quitar
        </button>
      </div>
    </div>

    <span v-if="verPrecio" class="shrink-0 text-sm font-medium tabular-nums">{{ formatearEuros(subtotal) }}</span>
  </li>
</template>
