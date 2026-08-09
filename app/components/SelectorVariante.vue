<script setup lang="ts">
import type { ProductoCatalogo, VarianteCatalogo } from '~~/server/utils/catalogo'

const props = defineProps<{ producto: ProductoCatalogo }>()
const seleccion = defineModel<VarianteCatalogo | null>({ required: true })

/**
 * Tres formas de variar, según lo que haya en Holded:
 *   mixto  → camisetas: color y talla, dos filas de selección
 *   talla  → sudaderas: una fila de tallas
 *   opcion → pañuelos: una fila de colores/tipos
 */
const colores = computed(() => {
  if (props.producto.eje !== 'mixto') return []
  const vistos = new Map<string, VarianteCatalogo[]>()
  for (const v of props.producto.variantes) {
    const clave = v.opcion ?? '—'
    if (!vistos.has(clave)) vistos.set(clave, [])
    vistos.get(clave)!.push(v)
  }
  return [...vistos.entries()].map(([nombre, variantes]) => ({
    nombre,
    variantes,
    stock: variantes.reduce((s, v) => s + Math.max(v.stock, 0), 0),
  }))
})

const colorElegido = ref<string | null>(null)

// Se arranca por el primer color que tenga algo en el armario, no por el primero a secas.
watchEffect(() => {
  if (props.producto.eje !== 'mixto' || colorElegido.value !== null) return
  colorElegido.value = (colores.value.find((c) => c.stock > 0) ?? colores.value[0])?.nombre ?? null
})

/** Opciones de la fila principal: tallas del color elegido, o las variantes tal cual. */
const opciones = computed<VarianteCatalogo[]>(() => {
  if (props.producto.eje === 'mixto') {
    return colores.value.find((c) => c.nombre === colorElegido.value)?.variantes ?? []
  }
  return props.producto.variantes
})

// Al cambiar de color se conserva la talla si ese color la tiene; si no, se elige otra.
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

function elegirColor(nombre: string) {
  colorElegido.value = nombre
}

const etiquetaFila = computed(() => {
  if (props.producto.eje === 'talla' || props.producto.eje === 'mixto') return 'Talla'
  return 'Opción'
})

/** En la fila de tallas basta con la letra; en la de opciones, el texto entero. */
function textoOpcion(v: VarianteCatalogo): string {
  if (props.producto.eje === 'mixto' || props.producto.eje === 'talla') {
    return v.talla ?? v.etiqueta
  }
  return v.etiqueta
}
</script>

<template>
  <div v-if="producto.variantes.length > 0" class="space-y-3">
    <!-- Fila de color, sólo cuando hay color y talla a la vez -->
    <div v-if="producto.eje === 'mixto'">
      <p class="mb-1.5 text-xs font-medium text-tinta-suave">Color</p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="color in colores"
          :key="color.nombre"
          type="button"
          :aria-pressed="colorElegido === color.nombre"
          :title="color.stock > 0 ? color.nombre : `${color.nombre} — sin stock`"
          class="group flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1 text-xs transition"
          :class="
            colorElegido === color.nombre
              ? 'border-acento bg-acento/10 font-medium text-acento-alto'
              : 'border-borde text-tinta-suave hover:border-tinta-suave'
          "
          @click="elegirColor(color.nombre)"
        >
          <span
            v-if="muestraDeColor(color.nombre)"
            class="size-4 rounded-full"
            :style="{
              backgroundColor: muestraDeColor(color.nombre)!,
              boxShadow: necesitaBorde(muestraDeColor(color.nombre)!)
                ? 'inset 0 0 0 1px rgb(0 0 0 / 0.15)'
                : undefined,
            }"
          />
          <span :class="color.stock <= 0 ? 'line-through decoration-from-font' : ''">
            {{ color.nombre }}
          </span>
        </button>
      </div>
    </div>

    <!-- Fila principal: tallas u opciones -->
    <div>
      <p class="mb-1.5 text-xs font-medium text-tinta-suave">{{ etiquetaFila }}</p>
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

    <p v-if="seleccion?.nota" class="text-xs text-tinta-suave italic">
      {{ seleccion.nota }}
    </p>
  </div>
</template>
