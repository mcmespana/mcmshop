<script setup lang="ts">
// Caja/regalo: todo lo que no es camiseta, sudadera ni pañuelo — chapas, guías,
// riñoneras, cintas.
defineProps<{ activo?: boolean }>()
</script>

<template>
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-hidden="true"
    class="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110"
  >
    <rect width="40" height="40" rx="10" :class="activo ? 'fill-acento' : 'fill-acento/10'" />
    <path d="M8 15 L20 9.5 L32 15 V27 L20 32 L8 27 Z" :class="activo ? 'fill-sobre-acento' : 'fill-acento'" />
    <path
      d="M8 15 L20 20 L32 15 M20 20 V32"
      stroke-width="1.6"
      stroke-linejoin="round"
      :class="activo ? 'stroke-acento' : 'stroke-lienzo-alto'"
    />
  </svg>
</template>
