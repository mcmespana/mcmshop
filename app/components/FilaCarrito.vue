<script setup lang="ts">
import type { LineaCarrito } from '~/composables/useCarrito'

const props = defineProps<{ linea: LineaCarrito }>()
defineEmits<{ cambiar: [cantidad: number]; quitar: [] }>()

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
      <p v-if="linea.variante" class="truncate text-xs text-muted-foreground">{{ linea.variante }}</p>

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

    <span class="shrink-0 text-sm font-medium tabular-nums">{{ formatearEuros(subtotal) }}</span>
  </li>
</template>
