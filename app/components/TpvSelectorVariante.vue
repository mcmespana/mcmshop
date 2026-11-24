<script setup lang="ts">
import type { ProductoCatalogo, VarianteCatalogo } from '~~/server/utils/catalogo'

/**
 * Elegir talla o color en el TPV: un toque y está en el ticket.
 *
 * Es el SelectorVariante de la tienda en grande y sin estado propio: aquí no se
 * "elige y luego se añade", se toca la talla y se añade. Las camisetas tienen
 * color y talla, así que primero va el color (que se recuerda entre aperturas:
 * en un puesto se venden rachas del mismo) y debajo las tallas de ese color.
 *
 * Lo que no tiene stock se puede vender igual —queda reservado—, así que no se
 * desactiva: se marca, para que quien atiende lo diga antes de cobrar.
 */
const props = defineProps<{ producto: ProductoCatalogo }>()
const emit = defineEmits<{ elegir: [variante: VarianteCatalogo] }>()

const colorRecordado = useState<Record<string, string>>('tpv-color', () => ({}))

const colores = computed(() => {
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

const color = computed({
  get: () =>
    colorRecordado.value[props.producto.id] ??
    (colores.value.find((c) => c.stock > 0) ?? colores.value[0])?.nombre ??
    null,
  set: (v) => {
    if (v) colorRecordado.value = { ...colorRecordado.value, [props.producto.id]: v }
  },
})

const opciones = computed(() =>
  props.producto.eje === 'mixto'
    ? (colores.value.find((c) => c.nombre === color.value)?.variantes ?? [])
    : props.producto.variantes,
)

function texto(v: VarianteCatalogo): string {
  return props.producto.eje === 'mixto' ? (v.talla ?? v.etiqueta) : v.etiqueta
}
</script>

<template>
  <div class="space-y-4 pb-2">
    <div v-if="colores.length">
      <p class="mb-2 flex items-baseline justify-between text-xs font-medium text-muted-foreground">
        <span>Color</span>
        <span class="text-foreground">{{ color }}</span>
      </p>
      <div class="flex flex-wrap gap-2.5">
        <button
          v-for="c in colores"
          :key="c.nombre"
          type="button"
          :aria-pressed="color === c.nombre"
          :aria-label="`${c.nombre}${c.stock > 0 ? '' : ', sin stock'}`"
          class="relative flex h-11 items-center gap-2 rounded-lg border px-3 text-sm transition"
          :class="
            color === c.nombre
              ? 'border-primary bg-primary/10 font-semibold'
              : 'border-border hover:border-muted-foreground'
          "
          @click="color = c.nombre"
        >
          <span
            v-if="c.muestra"
            class="size-5 shrink-0 rounded-full ring-1 ring-foreground/15"
            :style="{ backgroundColor: c.muestra }"
            aria-hidden="true"
          />
          <span :class="{ 'text-muted-foreground line-through decoration-from-font': c.stock <= 0 }">
            {{ c.nombre }}
          </span>
        </button>
      </div>
    </div>

    <div>
      <p class="mb-2 text-xs font-medium text-muted-foreground">
        {{ producto.eje === 'mixto' || producto.eje === 'talla' ? 'Talla — toca para añadir' : 'Toca para añadir' }}
      </p>
      <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <button
          v-for="v in opciones"
          :key="v.id"
          type="button"
          class="flex min-h-16 flex-col items-center justify-center rounded-lg border px-2 py-2 text-center transition active:scale-[0.97]"
          :class="
            v.stock > 0
              ? 'border-border bg-background hover:border-primary hover:bg-primary/5'
              : 'border-dashed border-warn/50 bg-warn/5 hover:border-warn'
          "
          @click="emit('elegir', v)"
        >
          <span class="text-lg leading-tight font-semibold">{{ texto(v) }}</span>
          <span
            class="mt-0.5 text-xs tabular-nums"
            :class="v.stock > 0 ? 'text-muted-foreground' : 'font-medium text-warn'"
          >
            {{ v.stock > 0 ? `quedan ${v.stock}` : 'sin stock · reserva' }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
