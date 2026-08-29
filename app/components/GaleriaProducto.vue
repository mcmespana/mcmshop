<script setup lang="ts">
import type { ImagenCatalogo } from '~~/server/utils/catalogo'
import IconoCamiseta from '~/components/IconoCamiseta.vue'
import IconoSudadera from '~/components/IconoSudadera.vue'
import IconoPanuelo from '~/components/IconoPanuelo.vue'
import IconoOtros from '~/components/IconoOtros.vue'

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
const hayVarias = computed(() => props.imagenes.length > 1)

/**
 * Tocar la foto pasa a la siguiente, dando la vuelta al llegar al final. En el
 * móvil es el gesto que la gente prueba primero, y los puntos de abajo son
 * demasiado pequeños para el pulgar.
 */
function siguiente() {
  indiceManual.value = (indice.value + 1) % props.imagenes.length
}

/**
 * Producto sin foto: en vez de un hueco gris se pinta la silueta de su categoría,
 * deducida del nombre igual que los filtros del catálogo. No es un dato de Holded
 * — es que una tarjeta vacía parece un error, y así parece una tarjeta.
 */
const iconoVacio = computed(() => {
  const n = normalizar(props.alt)
  if (/camiseta/.test(n)) return IconoCamiseta
  if (/sudadera/.test(n)) return IconoSudadera
  if (/pa[nñ]uelo/.test(n)) return IconoPanuelo
  return IconoOtros
})
</script>

<template>
  <div class="relative aspect-square overflow-hidden bg-lienzo">
    <template v-if="actual">
      <Transition
        mode="out-in"
        enter-active-class="transition duration-200 ease-out"
        leave-active-class="transition duration-150 ease-in"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <NuxtImg
          :key="actual.url"
          :src="actual.url"
          :alt="alt"
          loading="lazy"
          format="webp"
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 320px"
          class="size-full object-cover"
        />
      </Transition>

      <!-- Toda la foto es el botón de "siguiente": no hay flechas que estorben. -->
      <button
        v-if="hayVarias"
        type="button"
        class="absolute inset-0 z-10 cursor-pointer focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-inset focus-visible:outline-none"
        :aria-label="`Ver la siguiente foto de ${alt} (${indice + 1} de ${imagenes.length})`"
        @click="siguiente"
      />

      <!-- Miniaturas sólo si hay más de una foto -->
      <div
        v-if="hayVarias"
        class="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center gap-1.5 bg-gradient-to-t from-black/35 to-transparent p-2"
      >
        <button
          v-for="(img, i) in imagenes"
          :key="img.url"
          type="button"
          :aria-label="`Ver foto ${i + 1} de ${imagenes.length}`"
          :aria-current="i === indice"
          class="pointer-events-auto size-2 rounded-full transition"
          :class="i === indice ? 'w-5 bg-white' : 'bg-white/55 hover:bg-white/80'"
          @click="indiceManual = i"
        />
      </div>
    </template>

    <div
      v-else
      class="flex size-full flex-col items-center justify-center gap-2.5 bg-gradient-to-br from-acento/8 via-lienzo to-acento/12"
    >
      <!-- Trama diagonal muy tenue: da textura sin competir con las tarjetas que sí tienen foto. -->
      <div
        class="absolute inset-0 opacity-[0.07]"
        aria-hidden="true"
        style="
          background-image: repeating-linear-gradient(
            45deg,
            currentColor 0 1px,
            transparent 1px 9px
          );
        "
      />
      <component :is="iconoVacio" class="relative size-14 opacity-90" />
      <span class="relative text-xs text-tinta-suave">Foto en camino</span>
    </div>
  </div>
</template>
