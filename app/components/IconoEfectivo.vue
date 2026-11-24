<script setup lang="ts">
// Billete con una moneda delante: efectivo, pagado en mano en un puesto.
// Mismo marco que IconoTarjeta e IconoTransferencia para que la lista se lea pareja.
</script>

<template>
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
    <rect width="40" height="40" rx="10" class="fill-primary/10" />
    <rect x="6" y="12" width="24" height="15" rx="2.5" class="fill-primary" />
    <circle cx="18" cy="19.5" r="3.6" class="fill-card/70" />
    <circle cx="28.5" cy="26.5" r="6" class="fill-card stroke-primary" stroke-width="2" />
    <path d="M28.5 23.6v5.8" class="stroke-primary" stroke-width="1.8" stroke-linecap="round" />
  </svg>
</template>
