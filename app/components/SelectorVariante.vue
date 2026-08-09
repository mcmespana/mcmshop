<script setup lang="ts">
import type { ProductoCatalogo, VarianteCatalogo } from '~~/server/utils/catalogo'

const props = defineProps<{ producto: ProductoCatalogo }>()
const seleccion = defineModel<VarianteCatalogo | null>({ required: true })

/**
 * Tres formas de variar, según lo que haya en Holded:
 *   mixto  → camisetas: color y talla, dos filas
 *   talla  → sudaderas: una fila de tallas
 *   opcion → pañuelos: una fila de tipos
 *
 * Las camisetas pueden llegar a tener muchos colores, así que cuando todos son
 * colores reconocibles la fila pasa a muestras redondas sin texto: aguanta
 * veinte colores sin romper la tarjeta. El nombre del elegido se lee arriba.
 */
interface GrupoColor {
  nombre: string
  variantes: VarianteCatalogo[]
  stock: number
  muestra: string | null
}

const colores = computed<GrupoColor[]>(() => {
  if (props.producto.eje !== 'mixto') return []
  const grupos = new Map<string, VarianteCatalogo[]>()
  for (const v of props.producto.variantes) {
    const clave = v.opcion ?? '—'
    if (!grupos.has(clave)) grupos.set(clave, [])
    grupos.get(clave)!.push(v)
  }
  return [...grupos.entries()].map(([nombre, variantes]) => ({
    nombre,
    variantes,
    stock: variantes.reduce((s, v) => s + Math.max(v.stock, 0), 0),
    muestra: muestraDeColor(nombre),
  }))
})

/** Sólo se usan muestras si TODOS los colores se reconocen; mezclar queda sucio. */
const modoMuestra = computed(
  () => colores.value.length > 0 && colores.value.every((c) => c.muestra !== null),
)

const colorElegido = ref<string | null>(null)

watchEffect(() => {
  if (props.producto.eje !== 'mixto' || colorElegido.value !== null) return
  colorElegido.value = (colores.value.find((c) => c.stock > 0) ?? colores.value[0])?.nombre ?? null
})

const opciones = computed<VarianteCatalogo[]>(() => {
  if (props.producto.eje === 'mixto') {
    return colores.value.find((c) => c.nombre === colorElegido.value)?.variantes ?? []
  }
  return props.producto.variantes
})

// Al cambiar de color se conserva la talla si ese color la tiene. Es lo que
// espera quien está comparando colores en su talla, y evita perder la elección.
watch(
  opciones,
  (lista) => {
    if (lista.length === 0) {
      seleccion.value = null
      return
    }
    const tallaActual = seleccion.value?.talla
    const mismaTalla = tallaActual ? lista.find((v) => v.talla === tallaActual) : null
    if (mismaTalla) {
      seleccion.value = mismaTalla
      return
    }
    if (!lista.some((v) => v.id === seleccion.value?.id)) {
      seleccion.value = lista.find((v) => v.stock > 0) ?? lista[0]!
    }
  },
  { immediate: true },
)

const etiquetaFila = computed(() =>
  props.producto.eje === 'talla' || props.producto.eje === 'mixto' ? 'Talla' : 'Opción',
)

function textoOpcion(v: VarianteCatalogo): string {
  return props.producto.eje === 'opcion' ? v.etiqueta : (v.talla ?? v.etiqueta)
}

function rotuloColor(c: GrupoColor): string {
  return c.stock > 0 ? c.nombre : `${c.nombre} — sin stock`
}
</script>

<template>
  <div v-if="producto.variantes.length > 0" class="space-y-3">
    <!-- Colores -->
    <div v-if="producto.eje === 'mixto'">
      <div class="mb-1.5 flex items-baseline justify-between gap-2">
        <p class="text-xs font-medium text-tinta-suave">Color</p>
        <p class="truncate text-xs text-tinta">{{ colorElegido }}</p>
      </div>

      <!-- Muchos colores: muestras redondas, el nombre se lee arriba -->
      <div v-if="modoMuestra" class="flex flex-wrap gap-2">
        <button
          v-for="color in colores"
          :key="color.nombre"
          type="button"
          :aria-label="rotuloColor(color)"
          :aria-pressed="colorElegido === color.nombre"
          :title="rotuloColor(color)"
          class="relative size-7 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
          :class="
            colorElegido === color.nombre
              ? 'ring-2 ring-acento ring-offset-2 ring-offset-lienzo-alto'
              : 'ring-1 ring-black/10 hover:ring-tinta-suave'
          "
          :style="{ backgroundColor: color.muestra! }"
          @click="colorElegido = color.nombre"
        >
          <!-- Sin stock: aspa fina encima, sin ocultar el color -->
          <svg
            v-if="color.stock <= 0"
            viewBox="0 0 24 24"
            class="absolute inset-0 size-full text-white/90 mix-blend-difference"
            aria-hidden="true"
          >
            <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </button>
      </div>

      <!-- Colores que no son colores ("MIC", "CONOC. I"): texto -->
      <div v-else class="flex flex-wrap gap-1.5">
        <button
          v-for="color in colores"
          :key="color.nombre"
          type="button"
          :aria-pressed="colorElegido === color.nombre"
          :title="rotuloColor(color)"
          class="rounded-full border px-2.5 py-1 text-xs transition"
          :class="[
            colorElegido === color.nombre
              ? 'border-acento bg-acento/10 font-medium text-acento-alto'
              : 'border-borde text-tinta-suave hover:border-tinta-suave',
            color.stock <= 0 ? 'line-through decoration-from-font' : '',
          ]"
          @click="colorElegido = color.nombre"
        >
          {{ color.nombre }}
        </button>
      </div>
    </div>

    <!-- Tallas u opciones -->
    <div>
      <div class="mb-1.5 flex items-baseline justify-between gap-2">
        <p class="text-xs font-medium text-tinta-suave">{{ etiquetaFila }}</p>
        <p v-if="seleccion && seleccion.stock > 0 && seleccion.stock <= 5" class="text-xs text-tinta-suave">
          quedan {{ seleccion.stock }}
        </p>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="opcion in opciones"
          :key="opcion.id"
          type="button"
          :aria-pressed="seleccion?.id === opcion.id"
          :title="opcion.stock > 0 ? `${opcion.etiqueta} — quedan ${opcion.stock}` : AVISO_SIN_STOCK"
          class="min-w-9 rounded-lg border px-2.5 py-1.5 text-sm transition"
          :class="[
            seleccion?.id === opcion.id
              ? 'border-acento bg-acento/10 font-semibold text-acento-alto'
              : 'border-borde hover:border-tinta-suave',
            opcion.stock <= 0 ? 'text-tinta-suave line-through decoration-from-font' : '',
          ]"
          @click="seleccion = opcion"
        >
          {{ textoOpcion(opcion) }}
        </button>
      </div>
    </div>

    <p v-if="seleccion?.nota" class="text-xs text-tinta-suave italic">{{ seleccion.nota }}</p>
  </div>
</template>
