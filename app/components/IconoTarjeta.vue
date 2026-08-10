<script setup lang="ts">
// Tarjeta con banda magnética y chip. Ligera animación de "brillo" al pasar por
// encima, que en pago con tarjeta se lee como "esto es interactivo y seguro".
</script>

<template>
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-hidden="true"
    class="group overflow-hidden"
  >
    <rect width="40" height="40" rx="10" class="fill-acento/10" />
    <rect x="6" y="11" width="28" height="18" rx="3" class="fill-acento" />
    <rect x="6" y="15.5" width="28" height="3.4" class="fill-lienzo-alto" />
    <rect x="9.5" y="22" width="6.5" height="3.6" rx="1" class="fill-lienzo-alto/70" />
    <!-- destello diagonal que cruza la tarjeta al pasar el ratón -->
    <rect
      x="-14"
      y="11"
      width="9"
      height="18"
      class="-skew-x-[20deg] fill-white/35 transition-transform duration-700 ease-out group-hover:translate-x-[46px]"
    />
  </svg>
</template>
