<script setup lang="ts">
defineProps<{ activo?: boolean }>()
</script>

<template>
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-hidden="true"
    class="transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"
  >
    <rect width="40" height="40" rx="10" :class="activo ? 'fill-acento' : 'fill-acento/10'" />
    <path d="M8 10 H32 L20 30 Z" :class="activo ? 'fill-sobre-acento' : 'fill-acento'" />
    <circle cx="20" cy="10" r="2.4" :class="activo ? 'fill-acento' : 'fill-lienzo-alto'" />
  </svg>
</template>
