<script setup lang="ts">
useHead({
  titleTemplate: (titulo) => (titulo ? `${titulo} · Tienda MCM` : 'Tienda MCM'),
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
