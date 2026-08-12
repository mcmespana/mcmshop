<script setup lang="ts">
/**
 * Icono de la tienda: una bolsa de la compra con la "M" del MCM dentro.
 *
 * El verde es el de la tienda, no el azul del logo institucional: la Tienda MCM
 * tiene identidad propia y el logo del MCM ya firma al pie de cada página.
 * #13684b es exactamente el `--color-acento` del tema (el de los botones), y
 * #9be3c3 su versión clara.
 *
 * Los valores van escritos a mano y NO como tokens a propósito: el acento cambia
 * a azul en modo MCM Local, y un logo que cambia de color deja de ser un logo.
 * Se eligió este verde y no uno más oscuro porque sobre el lienzo oscuro un
 * fondo más hondo se confunde con la página y la bolsa parece flotar.
 *
 * La versión de `public/favicon.svg` es esta misma sin el pliegue de la bolsa y
 * con la M más gruesa, porque a 16 px el pliegue sólo ensucia.
 */
defineProps<{ animado?: boolean }>()
</script>

<template>
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Tienda MCM"
    :class="animado ? 'mcm-rebote' : ''"
  >
    <rect width="64" height="64" rx="15" fill="#13684b" />
    <path
      d="M24.5 23 V20 a7.5 7.5 0 0 1 15 0 V23"
      stroke="#9be3c3"
      stroke-width="2.5"
      stroke-linecap="round"
      fill="none"
    />
    <path d="M15 23 h34 v27 a6 6 0 0 1 -6 6 h-22 a6 6 0 0 1 -6 -6 z" fill="#9be3c3" />
    <line x1="15" y1="30" x2="49" y2="30" stroke="#13684b" stroke-width="1.6" opacity="0.35" />
    <!-- La M va ligeramente inclinada, como el trazo del logo original. -->
    <g transform="skewX(-6) translate(4.2 0)">
      <path
        d="M20.5 51 L24.8 34 L28.8 34 L32 43.2 L35.2 34 L39.2 34 L43.5 51 L39.2 51 L36.9 40.4 L33.4 49 L30.6 49 L27.1 40.4 L24.8 51 Z"
        fill="#13684b"
      />
    </g>
  </svg>
</template>
