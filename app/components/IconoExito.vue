<script setup lang="ts">
/**
 * El círculo y el check se dibujan con `pathLength="1"`: así el dashoffset va
 * siempre de 1 a 0 sin calcular la longitud real del trazo a mano. Alrededor,
 * un puñado de confeti sale disparado en círculo y se apaga — es la pantalla
 * que la persona ve justo después de confirmar el pedido, así que merece un
 * segundo de fiesta.
 */
const CONFETI = Array.from({ length: 10 }, (_, i) => {
  const angulo = (i / 10) * 2 * Math.PI
  const radio = 44 + (i % 2) * 10
  return {
    x: Math.cos(angulo) * radio,
    y: Math.sin(angulo) * radio,
    retraso: `${420 + i * 40}ms`,
    color: ['bg-acento', 'bg-acento-alto', 'bg-aviso'][i % 3]!,
  }
})
</script>

<template>
  <div class="relative inline-flex size-28 items-center justify-center">
    <span
      v-for="(c, i) in CONFETI"
      :key="i"
      class="mcm-confeti absolute size-2 rounded-full"
      :class="c.color"
      :style="{ '--tx': `${c.x}px`, '--ty': `${c.y}px`, animationDelay: c.retraso }"
    />
    <svg
      viewBox="0 0 64 64"
      class="relative size-20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="28" class="fill-acento/10" />
      <circle
        cx="32"
        cy="32"
        r="26"
        path-length="1"
        class="mcm-dibujar-circulo stroke-acento"
        stroke-width="3"
        fill="none"
      />
      <path
        d="M19 33.5 L28 42.5 L46 22"
        path-length="1"
        class="mcm-dibujar-check stroke-acento"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      />
    </svg>
  </div>
</template>
