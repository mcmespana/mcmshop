<script setup lang="ts">
/**
 * Envuelve la tarjeta de confirmación (icono, texto, botones... todo tal cual
 * viene por el slot) dentro de una impresora de tickets: una ranura arriba y
 * el papel "saliendo" a pasos con un corte dentado abajo, como un tique real.
 * El contenido no se toca — sólo cambia el marco que lo presenta.
 */
withDefaults(defineProps<{ imprimiendo?: boolean }>(), { imprimiendo: true })
</script>

<template>
  <div class="mcm-animar-entrada mx-auto max-w-lg">
    <div class="mcm-impresora-cuerpo mx-auto flex h-7 w-48 items-center justify-center rounded-t-xl">
      <span class="h-1.5 w-28 rounded-full bg-lienzo-alto/20"></span>
    </div>
    <div class="mcm-ticket-ventana">
      <div class="mcm-ticket-papel" :class="{ 'mcm-ticket-imprimir': imprimiendo }">
        <div class="p-8 text-center">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
