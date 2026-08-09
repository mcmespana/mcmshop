<script setup lang="ts">
/**
 * Se explica una sola vez para quién es el pedido, y sin bloquear: el catálogo
 * está detrás y se puede navegar sin tocar esto. Quien lo ignora se queda en
 * particular, que es lo más probable y lo menos dañino.
 *
 * Una pantalla completa de bienvenida haría lo contrario: frenar a todo el mundo
 * en la puerta para una pregunta que la mayoría responde igual.
 */
const { cambiar, descartarAviso, haElegido } = useModo()
</script>

<template>
  <div
    v-if="!haElegido"
    class="mb-5 rounded-tarjeta border border-borde bg-lienzo-alto p-4 sm:p-5"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="font-medium">¿Para quién es el pedido?</h2>
        <p class="mt-1 text-sm text-tinta-suave">
          Cambia lo que ves y cómo se paga después. Puedes cambiarlo cuando quieras desde arriba.
        </p>
      </div>
      <button
        type="button"
        class="-mt-1 -mr-1 shrink-0 rounded-md p-1.5 text-tinta-suave transition hover:text-tinta"
        aria-label="Cerrar y seguir como pedido personal"
        @click="descartarAviso"
      >
        ✕
      </button>
    </div>

    <div class="mt-4 grid gap-2.5 sm:grid-cols-2">
      <button
        type="button"
        class="rounded-lg border border-borde p-3 text-left transition hover:border-acento hover:bg-acento/5"
        @click="cambiar('b2b')"
      >
        <span class="block text-sm font-medium">Para mi delegación</span>
        <span class="mt-0.5 block text-xs text-tinta-suave">
          Pedidos grandes, se paga por transferencia.
        </span>
      </button>

      <button
        type="button"
        class="rounded-lg border border-borde p-3 text-left transition hover:border-acento hover:bg-acento/5"
        @click="cambiar('b2c')"
      >
        <span class="block text-sm font-medium">Para mí</span>
        <span class="mt-0.5 block text-xs text-tinta-suave">
          Lo que quieras, se paga con Bizum.
        </span>
      </button>
    </div>
  </div>
</template>
