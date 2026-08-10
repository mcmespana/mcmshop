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
      d="M14 8 L20 11 L26 8 L33 12.5 L29.5 18 L26 15.8 V32 H14 V15.8 L10.5 18 L7 12.5 Z"
      :class="activo ? 'fill-sobre-acento' : 'fill-acento'"
    />
  </svg>
</template>
