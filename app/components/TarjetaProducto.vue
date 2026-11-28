<script setup lang="ts">
import type { ProductoCatalogo, VarianteCatalogo } from '~~/server/utils/catalogo'

const props = defineProps<{ producto: ProductoCatalogo; indice?: number }>()

// Entrada en cascada: cada tarjeta aparece un poco después que la anterior. Se
// limita a las primeras 12 para que en catálogos grandes no haya que esperar
// un segundo entero a que aparezca la última fila.
const retrasoEntrada = `${Math.min(props.indice ?? 0, 12) * 45}ms`

const { anadir } = useCarrito()
const { evento } = useEvento()

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

/** Los Drops MCM llevan su propia tarjeta, de tinta (ver main.css). */
const drop = computed(() => dropDe(props.producto))
const esDeDrop = computed(() => drop.value !== null)

const precio = computed(() => variante.value?.precioCentimos ?? props.producto.precioCentimos)
const stock = computed(() => variante.value?.stock ?? props.producto.stock)
const sinPrecioAqui = computed(() => sinPrecio(props.producto, !!evento.value))
/** Sin stock de algo que admite reserva: no es "sin stock", es "reserva". */
const reserva = computed(() => esReserva(props.producto, stock.value, !evento.value))
const aviso = computed(() => (reserva.value ? null : textoStock(stock.value)))
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
    class="group flex flex-col overflow-hidden rounded-xl"
    :class="
      esDeDrop
        ? 'mcm-drop mcm-drop-entrada'
        : 'mcm-animar-entrada border border-border bg-card transition hover:border-muted-foreground/40 hover:shadow-lg hover:shadow-foreground/5'
    "
    :style="{ animationDelay: retrasoEntrada, '--retraso': retrasoEntrada }"
  >
    <div v-if="esDeDrop" class="mcm-drop-brillo" aria-hidden="true" />

    <div class="relative" :class="esDeDrop ? 'overflow-hidden' : ''">
      <GaleriaProducto
        v-if="!esDeDrop || producto.imagenes.length > 0"
        :imagenes="producto.imagenes"
        :alt="producto.nombre"
        :color="color"
      />
      <!--
        Drop sin foto todavía: el número en grande, sobre la tinta, como la
        etiqueta de una tanda. Una silueta de camiseta genérica aquí la haría
        parecer una más del armario.
      -->
      <div
        v-else
        class="flex aspect-square flex-col items-center justify-center gap-2 bg-background px-6 text-center"
      >
        <LogoMCM class="mb-1 size-9 opacity-90" />
        <p class="mcm-drop-marca text-[11px] text-muted-foreground">Drops MCM</p>
        <p v-if="drop?.numero" class="text-4xl leading-none font-semibold tabular-nums">{{ drop.numero }}</p>
        <p v-if="drop?.nombre" class="text-sm text-muted-foreground">{{ drop.nombre }}</p>
      </div>

      <!-- El telón: la tinta tapa la foto y cae al llegar la tarjeta, que es lo que es un drop. -->
      <div v-if="esDeDrop" class="mcm-drop-telon" aria-hidden="true" />

      <span
        v-if="esDeDrop"
        class="mcm-drop-marca absolute top-3 left-3 z-10 rounded-sm bg-card px-2 py-1 text-[10px] leading-none text-foreground tabular-nums ring-1 ring-border"
      >
        {{ etiquetaDrop(drop) }}
      </span>

      <span
        v-if="reserva"
        class="absolute top-3 right-3 z-10 rounded-sm px-2 py-1 text-[11px] leading-none font-semibold tracking-wide uppercase"
        :class="
          esDeDrop
            ? 'bg-card/90 text-foreground ring-1 ring-border'
            : 'bg-foreground text-card'
        "
      >
        Reserva
      </span>
      <span
        v-else-if="aviso"
        class="absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur"
        :class="[
          aviso.tono === 'agotado'
            ? 'bg-warn/15 text-warn ring-1 ring-warn/30'
            : 'bg-card/85 text-muted-foreground ring-1 ring-border',
          esDeDrop ? 'top-10' : '',
        ]"
      >
        {{ aviso.texto }}
      </span>
    </div>

    <div class="relative z-[3] flex flex-1 flex-col gap-3" :class="esDeDrop ? 'p-4' : 'p-3.5'">
      <div>
        <h3 class="leading-tight font-medium" :class="esDeDrop ? 'text-[1.05rem]' : ''">
          {{ producto.nombre }}
        </h3>
        <p v-if="producto.descripcion" class="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {{ producto.descripcion }}
        </p>
      </div>

      <SelectorVariante v-model="variante" :producto="producto" />

      <p v-if="reserva" class="text-xs leading-snug text-muted-foreground">
        {{ TEXTO_RESERVA }}
      </p>
      <p v-else-if="stock < 0" class="text-xs leading-snug text-warn">
        {{ AVISO_SIN_STOCK }}
      </p>

      <div class="mt-auto flex items-center justify-between gap-2 pt-1">
        <span v-if="!sinPrecioAqui" class="text-lg font-semibold tabular-nums">{{
          formatearEuros(precio)
        }}</span>

        <div class="ml-auto flex items-center gap-1.5">
          <div class="flex items-center rounded-lg border border-border">
            <button
              type="button"
              class="px-2.5 py-1.5 text-muted-foreground transition hover:text-foreground disabled:opacity-40"
              :disabled="cantidad <= 1"
              aria-label="Quitar una unidad"
              @click="bajar"
            >
              −
            </button>
            <span class="w-7 text-center text-sm font-medium tabular-nums">{{ cantidad }}</span>
            <button
              type="button"
              class="px-2.5 py-1.5 text-muted-foreground transition hover:text-foreground"
              aria-label="Añadir una unidad"
              @click="subir"
            >
              +
            </button>
          </div>

          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover active:scale-95"
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
              <span v-else key="texto">{{ reserva ? 'Reservar' : 'Añadir' }}</span>
            </Transition>
            <span v-if="anadido">{{ reserva ? '¡Reservado!' : '¡Añadido!' }}</span>
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
