<script setup lang="ts">
/**
 * Icono del conmutador de tema: sol, luna o mitad y mitad para "sistema".
 *
 * Dibujado a mano como los demás iconos de la tienda. Tres estados en un solo
 * botón necesitan que el dibujo diga en cuál estás; el `title` y el `aria-label`
 * lo cuentan con palabras, que es lo que oye quien no ve el icono.
 */
const { tema } = useTema()
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="tema === 'claro'">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </template>
    <template v-else-if="tema === 'oscuro'">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </template>
    <template v-else>
      <!-- Sistema: el círculo medio relleno, que es como se dibuja «lo que diga el aparato». -->
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" />
    </template>
  </svg>
</template>
