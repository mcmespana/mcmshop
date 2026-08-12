<script setup lang="ts">
const { modo, delegacion, esDelegacion, nombreModo, proponer } = useModo()
const { unidades } = useCarrito()
const { data: sesion } = await useFetch('/api/sesion')

// Si su contacto en Holded lleva el tag `mcmlocal`, se le propone modo delegación
// en todo el portal. Sigue siendo una propuesta: si ya eligió, manda su elección.
watchEffect(() => {
  if (sesion.value?.autenticado && sesion.value.esDelegacion) proponer('b2b')
})

/**
 * Los textos legales viven en la web de Comunica, que es donde los mantiene la
 * asociación. Duplicarlos aquí garantizaría que un día dejen de coincidir.
 */
const LEGALES = [
  {
    texto: 'Términos y condiciones',
    url: 'https://comunica.movimientoconsolacion.com/terminoscondiciones/',
  },
  {
    texto: 'Política de privacidad',
    url: 'https://comunica.movimientoconsolacion.com/politicadeprivacidad/',
  },
  { texto: 'Aviso legal', url: 'https://comunica.movimientoconsolacion.com/avisolegal/' },
]

/**
 * El tinte cambia según para quién es el pedido. No es decoración: es que a las
 * dos horas de estar pidiendo camisetas conviene poder ver de un vistazo si lo
 * estás haciendo para tu delegación o para ti.
 */
useHead({
  htmlAttrs: { lang: 'es', 'data-modo': () => modo.value },
})
</script>

<template>
  <div class="min-h-screen">
    <header class="sticky top-0 z-30 border-b border-borde bg-lienzo/90 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4">
        <NuxtLink to="/" class="mr-auto flex items-center gap-2 leading-tight">
          <LogoMCM class="size-8 shrink-0" />
          <span>
            <span class="block font-semibold">Tienda MCM</span>
            <span class="hidden text-xs text-tinta-suave sm:block">
              Movimiento Consolación para el Mundo
            </span>
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
          Quién está comprando, siempre visible: en B2B el pedido lo hace una
          persona en nombre de un grupo, y equivocarse de destinatario es caro.
          Se vuelve a la bienvenida para cambiarlo, que es donde está el selector.
        -->
        <NuxtLink
          to="/bienvenida"
          class="flex items-center gap-2 rounded-lg border border-borde px-2.5 py-1.5 text-xs transition hover:border-tinta-suave"
          :title="esDelegacion ? 'Cambiar de MCM Local' : 'Cambiar tipo de pedido'"
        >
          <span
            class="size-1.5 rounded-full"
            :class="esDelegacion ? 'bg-acento' : 'bg-tinta-suave'"
            aria-hidden="true"
          />
          <span class="max-w-32 truncate font-medium sm:max-w-none">{{ nombreModo }}</span>
          <span class="text-tinta-suave">Cambiar</span>
        </NuxtLink>

        <span
          v-if="unidades > 0"
          class="flex size-7 items-center justify-center rounded-full bg-acento text-xs font-semibold text-sobre-acento tabular-nums lg:hidden"
        >
          {{ unidades }}
        </span>
      </div>
    </header>

    <slot />

    <footer class="mx-auto max-w-7xl space-y-3 px-4 py-10">
      <div class="border-t border-borde pt-6">
        <LogoInstitucional :ancho="130" />
      </div>

      <ContactoAyuda variante="compacta" />

      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-tinta-suave">
        <span>Movimiento Consolación para el Mundo</span>
        <NuxtLink
          v-if="sesion?.autenticado"
          to="/mis-pedidos"
          class="underline-offset-2 hover:underline sm:hidden"
        >
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
      <p v-if="delegacion" class="text-xs text-tinta-suave">
        Estás pidiendo como <strong class="font-medium">{{ delegacion.nombre }}</strong
        >.
      </p>
    </footer>
  </div>
</template>
