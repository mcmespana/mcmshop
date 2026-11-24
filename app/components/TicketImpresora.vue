<script setup lang="ts">
/**
 * Envuelve la tarjeta de confirmación (icono, texto, botones... todo tal cual
 * viene por el slot) dentro de una impresora de tickets: una ranura arriba y
 * el papel "saliendo" a pasos con un corte dentado abajo, como un tique real.
 * El contenido no se toca — sólo cambia el marco que lo presenta.
 *
 * `compacto` quita relleno para el tique del puesto, que vive en un móvil de
 * 360 px y necesita cada milímetro para el número y las líneas.
 */
withDefaults(defineProps<{ imprimiendo?: boolean; compacto?: boolean }>(), {
  imprimiendo: true,
  compacto: false,
})
</script>

<template>
  <div class="mcm-animar-entrada mx-auto max-w-lg">
    <div class="mcm-impresora-cuerpo mx-auto flex h-7 w-48 items-center justify-center rounded-t-xl">
      <span class="h-1.5 w-28 rounded-full bg-card/20"></span>
    </div>
    <div class="mcm-ticket-ventana">
      <div class="mcm-ticket-papel" :class="{ 'mcm-ticket-imprimir': imprimiendo }">
        <div :class="compacto ? 'overflow-hidden px-5 pt-5 pb-5' : 'p-8 text-center'">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
