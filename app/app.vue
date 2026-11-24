<script setup lang="ts">
useHead({
  titleTemplate: (titulo) => (titulo ? `${titulo} · Tienda MCM` : 'Tienda MCM'),
})
</script>

<template>
  <!--
    Barra de 2 px arriba mientras se navega (design.md §3.5, "Navegando"). Sin
    ella, al tocar algo que carga datos —entrar a la tienda, cambiar de modo—
    la pantalla se quedaba quieta hasta que llegaba todo, y parecía que no
    había respondido.
  -->
  <NuxtLoadingIndicator color="var(--color-primary)" :height="2" :throttle="80" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
