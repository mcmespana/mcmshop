<script setup lang="ts">
/**
 * Logo oficial del Movimiento Consolación para el Mundo.
 *
 * Va al pie de las pantallas como firma institucional: la tienda tiene su
 * propio icono (`LogoMCM`), pero conviene que se vea de quién es la casa.
 *
 * Es un `<img>` normal y no `<NuxtImg>` a propósito: es un único activo
 * estático, ya redimensionado a 320 px en `public/`, y pasarlo por el
 * optimizador para servir siempre el mismo tamaño no aporta nada.
 */
withDefaults(defineProps<{ ancho?: number }>(), { ancho: 120 })
</script>

<template>
  <img
    src="/mcm-mini.png"
    alt="Movimiento Consolación para el Mundo"
    :width="ancho"
    :height="Math.round((ancho * 170) / 450)"
    loading="lazy"
    decoding="async"
    class="h-auto opacity-80 transition hover:opacity-100"
  />
</template>
