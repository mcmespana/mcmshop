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
    class="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
  >
    <rect width="40" height="40" rx="10" :class="activo ? 'fill-acento' : 'fill-acento/10'" />
    <path
      d="M13.5 8.5 L20 11.5 L26.5 8.5 L34 13 L30.5 18.5 L27 16.3 V31.5 H13 V16.3 L9.5 18.5 L6 13 Z"
      :class="activo ? 'fill-sobre-acento' : 'fill-acento'"
    />
    <path
      d="M17 15.5 V19.5"
      stroke-width="2"
      stroke-linecap="round"
      :class="activo ? 'stroke-acento' : 'stroke-lienzo-alto'"
    />
    <path
      d="M23 15.5 V19.5"
      stroke-width="2"
      stroke-linecap="round"
      :class="activo ? 'stroke-acento' : 'stroke-lienzo-alto'"
    />
  </svg>
</template>
