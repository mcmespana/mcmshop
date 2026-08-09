<script setup lang="ts">
import type { ImagenCatalogo } from '~~/server/utils/catalogo'

const props = defineProps<{
  imagenes: ImagenCatalogo[]
  alt: string
  /** Color elegido ahora mismo, para saltar a su foto si está identificada. */
  color?: string | null
}>()

const indiceManual = ref<number | null>(null)

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Si la descripción de la foto en Holded nombra el color, se salta a esa foto al
 * elegirlo. Mientras las descripciones estén vacías esto no hace nada y la
 * galería se comporta como una galería normal.
 */
const indicePorColor = computed(() => {
  if (!props.color) return null
  const objetivo = normalizar(props.color)
  const i = props.imagenes.findIndex((img) => {
    if (!img.descripcion) return false
    const d = normalizar(img.descripcion)
    return d === objetivo || d.includes(objetivo) || objetivo.includes(d)
  })
  return i === -1 ? null : i
})

// La elección manual manda mientras no cambie el color.
watch(indicePorColor, () => {
  indiceManual.value = null
})

const indice = computed(() => indiceManual.value ?? indicePorColor.value ?? 0)
const actual = computed(() => props.imagenes[indice.value] ?? null)
</script>

<template>
  <div class="relative aspect-square overflow-hidden bg-lienzo">
    <template v-if="actual">
      <NuxtImg
        :key="actual.url"
        :src="actual.url"
        :alt="alt"
        loading="lazy"
        format="webp"
        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 320px"
        class="size-full object-cover"
      />

      <!-- Miniaturas sólo si hay más de una foto -->
      <div
        v-if="imagenes.length > 1"
        class="absolute inset-x-0 bottom-0 flex justify-center gap-1.5 bg-gradient-to-t from-black/35 to-transparent p-2"
      >
        <button
          v-for="(img, i) in imagenes"
          :key="img.url"
          type="button"
          :aria-label="`Ver foto ${i + 1} de ${imagenes.length}`"
          :aria-current="i === indice"
          class="size-2 rounded-full transition"
          :class="i === indice ? 'w-5 bg-white' : 'bg-white/55 hover:bg-white/80'"
          @click="indiceManual = i"
        />
      </div>
    </template>

    <div v-else class="flex size-full items-center justify-center text-sm text-tinta-suave">
      Sin foto
    </div>
  </div>
</template>
