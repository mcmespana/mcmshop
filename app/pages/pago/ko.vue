<script setup lang="ts">
/**
 * Vuelta desde Redsys cuando el pago no sale.
 *
 * El carrito NO se vacía: lo más probable es que quiera reintentar, y hacerle
 * volver a montarlo sería castigarle por un problema del banco.
 */
useSeoMeta({ title: 'El pago no se ha completado' })
</script>

<template>
  <main class="mx-auto max-w-lg px-4 py-16 text-center">
    <div class="rounded-tarjeta border border-borde bg-lienzo-alto p-8">
      <h1 class="text-xl font-semibold">El pago no se ha completado</h1>
      <p class="mt-2 text-sm text-tinta-suave">
        No se te ha cobrado nada y tu carrito sigue tal cual. Puede haber sido un dato mal escrito
        o un rechazo del banco.
      </p>
      <div class="mt-6 flex flex-wrap justify-center gap-2">
        <NuxtLink
          to="/checkout"
          class="rounded-lg bg-acento px-4 py-2.5 text-sm font-medium text-sobre-acento transition hover:bg-acento-alto"
        >
          Volver a intentarlo
        </NuxtLink>
        <NuxtLink
          to="/"
          class="rounded-lg border border-borde px-4 py-2.5 text-sm font-medium transition hover:border-tinta-suave"
        >
          Volver al catálogo
        </NuxtLink>
      </div>
      <p class="mt-5 text-xs text-tinta-suave">
        Si se repite, escríbenos y lo apuntamos a mano. No hace falta que pelees con el TPV.
      </p>

      <div class="mx-auto mt-5 max-w-sm text-left">
        <ContactoAyuda variante="destacada" />
      </div>
    </div>
  </main>
</template>
