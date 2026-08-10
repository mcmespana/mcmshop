<script setup lang="ts">
/**
 * Marca propia del portal: un globo con una cruz encima y una carita amable
 * dentro, en el espíritu del logo que ya lleva la ropa ("+M̥C"). No es el logo
 * oficial pixel a pixel, es una interpretación ligera para no depender de un
 * archivo de marca que no tenemos en el repositorio.
 */
defineProps<{ animado?: boolean }>()
</script>

<template>
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Tienda MCM"
    :class="animado ? 'mcm-rebote' : ''"
  >
    <rect width="40" height="40" rx="12" class="fill-acento/10" />
    <!-- cruz -->
    <rect x="18.2" y="5.5" width="3.6" height="10.5" rx="1.4" class="fill-acento" />
    <rect x="13.7" y="9" width="12.6" height="3.6" rx="1.4" class="fill-acento" />
    <!-- globo con carita -->
    <circle cx="20" cy="23.5" r="10.5" class="fill-acento" />
    <circle cx="16.2" cy="22" r="1.7" class="fill-lienzo-alto" />
    <circle cx="23.8" cy="22" r="1.7" class="fill-lienzo-alto" />
    <path
      d="M15.3 27 Q20 30.6 24.7 27"
      class="stroke-lienzo-alto"
      stroke-width="1.8"
      stroke-linecap="round"
      fill="none"
    />
  </svg>
</template>
