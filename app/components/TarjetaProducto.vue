<script setup lang="ts">
import type { ProductoCatalogo, VarianteCatalogo } from '~~/server/utils/catalogo'

const props = defineProps<{ producto: ProductoCatalogo; indice?: number }>()

// Entrada en cascada: cada tarjeta aparece un poco después que la anterior. Se
// limita a las primeras 12 para que en catálogos grandes no haya que esperar
// un segundo entero a que aparezca la última fila.
const retrasoEntrada = `${Math.min(props.indice ?? 0, 12) * 45}ms`

const { anadir } = useCarrito()

const variante = ref<VarianteCatalogo | null>(null)
const cantidad = ref(1)
const anadido = ref(false)

// En B2B nadie pide una camiseta, pide doce: el stepper vive en la tarjeta para
// no gastar un click por producto abriendo el carrito a corregir cantidades.
function subir() {
  cantidad.value++
}
function bajar() {
  if (cantidad.value > 1) cantidad.value--
}

const precio = computed(() => variante.value?.precioCentimos ?? props.producto.precioCentimos)
const stock = computed(() => variante.value?.stock ?? props.producto.stock)
const aviso = computed(() => textoStock(stock.value))
/** El color sale de la variante elegida; la galería lo usa para saltar a su foto. */
const color = computed(() => variante.value?.opcion ?? null)

let temporizador: ReturnType<typeof setTimeout> | undefined

function alAnadir() {
  anadir(props.producto, variante.value, cantidad.value)
  // Respuesta inmediata en la tarjeta: la confirmación no espera a nada.
  anadido.value = true
  clearTimeout(temporizador)
  temporizador = setTimeout(() => (anadido.value = false), 1600)
  cantidad.value = 1
}

onBeforeUnmount(() => clearTimeout(temporizador))
</script>

<template>
  <article
    class="group mcm-animar-entrada flex flex-col overflow-hidden rounded-tarjeta border border-borde bg-lienzo-alto transition hover:-translate-y-0.5 hover:border-tinta-suave/40 hover:shadow-lg hover:shadow-tinta/5"
    :style="{ animationDelay: retrasoEntrada }"
  >
    <div class="relative">
      <GaleriaProducto :imagenes="producto.imagenes" :alt="producto.nombre" :color="color" />

      <span
        v-if="aviso"
        class="absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur"
        :class="
          aviso.tono === 'agotado'
            ? 'bg-aviso/15 text-aviso ring-1 ring-aviso/30'
            : 'bg-lienzo-alto/85 text-tinta-suave ring-1 ring-borde'
        "
      >
        {{ aviso.texto }}
      </span>
    </div>

    <div class="flex flex-1 flex-col gap-3 p-3.5">
      <div>
        <h3 class="leading-tight font-medium">{{ producto.nombre }}</h3>
        <p v-if="producto.descripcion" class="mt-0.5 line-clamp-2 text-xs text-tinta-suave">
          {{ producto.descripcion }}
        </p>
      </div>

      <SelectorVariante v-model="variante" :producto="producto" />

      <p v-if="stock < 0" class="text-xs leading-snug text-aviso">
        {{ AVISO_SIN_STOCK }}
      </p>

      <div class="mt-auto flex items-center justify-between gap-2 pt-1">
        <span class="text-lg font-semibold tabular-nums">{{ formatearEuros(precio) }}</span>

        <div class="flex items-center gap-1.5">
          <div class="flex items-center rounded-lg border border-borde">
            <button
              type="button"
              class="px-2.5 py-1.5 text-tinta-suave transition hover:text-tinta disabled:opacity-40"
              :disabled="cantidad <= 1"
              aria-label="Quitar una unidad"
              @click="bajar"
            >
              −
            </button>
            <span class="w-7 text-center text-sm font-medium tabular-nums">{{ cantidad }}</span>
            <button
              type="button"
              class="px-2.5 py-1.5 text-tinta-suave transition hover:text-tinta"
              aria-label="Añadir una unidad"
              @click="subir"
            >
              +
            </button>
          </div>

          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg bg-acento px-3 py-2 text-sm font-medium text-sobre-acento transition hover:bg-acento-alto active:scale-95"
            @click="alAnadir"
          >
            <Transition
              mode="out-in"
              enter-active-class="transition duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              enter-from-class="scale-50 opacity-0"
              enter-to-class="scale-100 opacity-100"
            >
              <svg
                v-if="anadido"
                key="check"
                viewBox="0 0 20 20"
                fill="none"
                class="size-4"
                aria-hidden="true"
              >
                <path
                  d="M4 10.5 L8 14.5 L16 5.5"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span v-else key="texto">Añadir</span>
            </Transition>
            <span v-if="anadido">¡Añadido!</span>
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
