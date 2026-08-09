<script setup lang="ts">
const { modo, cambiar, proponer } = useModo()
const { unidades } = useCarrito()
const { data: sesion } = await useFetch('/api/sesion')

// Si su contacto en Holded lleva el tag `mcmlocal`, se le propone modo delegación
// en todo el portal, no sólo al pagar. Sigue siendo una propuesta: si ya eligió
// otra cosa, manda su elección.
watchEffect(() => {
  if (sesion.value?.autenticado && sesion.value.esDelegacion) proponer('b2b')
})

useHead({
  titleTemplate: (titulo) => (titulo ? `${titulo} · Tienda MCM` : 'Tienda MCM'),
  htmlAttrs: { lang: 'es' },
})

/**
 * Los textos legales viven en la web de Comunica, que es donde los mantiene la
 * asociación. Duplicarlos aquí garantizaría que un día dejen de coincidir.
 */
const LEGALES = [
  { texto: 'Términos y condiciones', url: 'https://comunica.movimientoconsolacion.com/terminoscondiciones/' },
  { texto: 'Política de privacidad', url: 'https://comunica.movimientoconsolacion.com/politicadeprivacidad/' },
  { texto: 'Aviso legal', url: 'https://comunica.movimientoconsolacion.com/avisolegal/' },
]
</script>

<template>
  <div class="min-h-screen">
    <header class="sticky top-0 z-30 border-b border-borde bg-lienzo/90 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4">
        <NuxtLink to="/" class="mr-auto leading-tight">
          <span class="block font-semibold">Tienda MCM</span>
          <!-- En móvil el nombre largo ocupaba tres líneas y empujaba el selector. -->
          <span class="hidden text-xs text-tinta-suave sm:block">
            Movimiento Consolación para el Mundo
          </span>
        </NuxtLink>

        <NuxtLink
          v-if="sesion?.autenticado"
          to="/mis-pedidos"
          class="hidden text-sm text-tinta-suave transition hover:text-tinta sm:block"
        >
          Mis pedidos
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

    <footer class="mx-auto max-w-7xl px-4 py-10">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-tinta-suave">
        <span>Asociación Juvenil Movimiento Consolación para el Mundo</span>
        <NuxtLink v-if="sesion?.autenticado" to="/mis-pedidos" class="underline-offset-2 hover:underline sm:hidden">
          Mis pedidos
        </NuxtLink>
        <a
          v-for="legal in LEGALES"
          :key="legal.url"
          :href="legal.url"
          target="_blank"
          rel="noopener"
          class="underline-offset-2 transition hover:text-tinta hover:underline"
        >
          {{ legal.texto }}
        </a>
      </div>
    </footer>
  </div>
</template>
