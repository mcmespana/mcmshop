<script setup lang="ts">
const { modo, cambiar } = useModo()
const { unidades } = useCarrito()

useHead({
  titleTemplate: (titulo) => (titulo ? `${titulo} · Tienda MCM` : 'Tienda MCM'),
  htmlAttrs: { lang: 'es' },
})
</script>

<template>
  <div class="min-h-screen">
    <header class="sticky top-0 z-30 border-b border-borde bg-lienzo/90 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <NuxtLink to="/" class="mr-auto leading-tight">
          <span class="block font-semibold">Tienda MCM</span>
          <!-- En móvil el nombre largo ocupaba tres líneas y empujaba el selector. -->
          <span class="hidden text-xs text-tinta-suave sm:block">
            Movimiento Consolación para el Mundo
          </span>
        </NuxtLink>

        <!--
          El modo lo elige la persona, no el sistema: el dominio del correo no
          distingue una delegación de alguien con cuenta del dominio.
        -->
        <div
          class="flex rounded-lg border border-borde p-0.5 text-xs"
          role="group"
          aria-label="Tipo de pedido"
        >
          <button
            type="button"
            class="rounded-md px-2.5 py-1 transition"
            :class="modo === 'b2c' ? 'bg-acento text-sobre-acento' : 'text-tinta-suave hover:text-tinta'"
            :aria-pressed="modo === 'b2c'"
            @click="cambiar('b2c')"
          >
            Particular
          </button>
          <button
            type="button"
            class="rounded-md px-2.5 py-1 transition"
            :class="modo === 'b2b' ? 'bg-acento text-sobre-acento' : 'text-tinta-suave hover:text-tinta'"
            :aria-pressed="modo === 'b2b'"
            @click="cambiar('b2b')"
          >
            Delegación
          </button>
        </div>

        <span
          v-if="unidades > 0"
          class="flex size-7 items-center justify-center rounded-full bg-acento text-xs font-semibold text-sobre-acento tabular-nums lg:hidden"
        >
          {{ unidades }}
        </span>
      </div>
    </header>

    <NuxtPage />

    <footer class="mx-auto max-w-7xl px-4 py-10 text-xs text-tinta-suave">
      Asociación Juvenil Movimiento Consolación para el Mundo
    </footer>
  </div>
</template>
