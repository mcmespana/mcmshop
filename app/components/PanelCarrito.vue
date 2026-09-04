<script setup lang="ts">
const { lineas, abierto, cambiarCantidad, quitar, unidades, totalCentimos, vacio } = useCarrito()
const { modo } = useModo()

const desplegadoMovil = ref(false)

// Al añadir algo desde una tarjeta, el carrito se abre solo en móvil.
watch(abierto, (v) => {
  if (v) desplegadoMovil.value = true
})
</script>

<template>
  <!-- Escritorio: columna fija, siempre visible, nunca una página aparte -->
  <aside class="sticky top-20 hidden max-h-[calc(100vh-6rem)] lg:flex lg:flex-col">
    <div
      class="flex max-h-full flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      <header class="flex items-baseline justify-between border-b border-border px-4 py-3">
        <h2 class="font-medium">Tu pedido</h2>
        <span class="text-xs text-muted-foreground">
          {{ unidades }} {{ unidades === 1 ? 'unidad' : 'unidades' }}
        </span>
      </header>

      <div v-if="vacio" class="px-4 py-8 text-center text-sm text-muted-foreground">
        Todavía no has añadido nada.
      </div>

      <ul v-else class="flex-1 divide-y divide-border overflow-y-auto">
        <FilaCarrito
          v-for="linea in lineas"
          :key="linea.clave"
          :linea="linea"
          @cambiar="(n) => cambiarCantidad(linea.clave, n)"
          @quitar="quitar(linea.clave)"
        />
      </ul>

      <footer v-if="!vacio" class="border-t border-border px-4 py-3">
        <div class="mb-3 flex items-baseline justify-between">
          <span class="text-sm text-muted-foreground">Total</span>
          <span class="text-lg font-semibold tabular-nums">{{
            formatearEuros(totalCentimos)
          }}</span>
        </div>
        <NuxtLink
          to="/checkout"
          class="block rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
        >
          Continuar
        </NuxtLink>
        <p class="mt-2 text-center text-xs text-muted-foreground">
          {{ modo === 'b2b' ? 'Pedido de delegación' : 'Pedido personal' }}
        </p>
      </footer>
    </div>
  </aside>

  <!-- Móvil: barra inferior desplegable. Los monitores entran desde el teléfono. -->
  <div
    v-if="!vacio"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden"
  >
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-[50vh] opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="max-h-[50vh] opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <ul v-if="desplegadoMovil" class="max-h-[50vh] divide-y divide-border overflow-y-auto">
        <FilaCarrito
          v-for="linea in lineas"
          :key="linea.clave"
          :linea="linea"
          @cambiar="(n) => cambiarCantidad(linea.clave, n)"
          @quitar="quitar(linea.clave)"
        />
      </ul>
    </Transition>

    <div class="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        class="flex flex-1 items-center gap-2 text-left"
        :aria-expanded="desplegadoMovil"
        @click="desplegadoMovil = !desplegadoMovil"
      >
        <span
          class="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums"
        >
          {{ unidades }}
        </span>
        <span class="text-sm font-semibold tabular-nums">{{ formatearEuros(totalCentimos) }}</span>
        <span class="text-xs text-muted-foreground">{{ desplegadoMovil ? 'Ocultar' : 'Ver' }}</span>
      </button>

      <NuxtLink
        to="/checkout"
        class="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
      >
        Continuar
      </NuxtLink>
    </div>
  </div>
</template>
