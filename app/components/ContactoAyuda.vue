<script setup lang="ts">
const props = defineProps<{ variante?: 'compacta' | 'destacada' }>()
const variante = props.variante ?? 'compacta'
</script>

<template>
  <!-- Compacta: para el pie de página, en cualquier pantalla del portal -->
  <div v-if="variante === 'compacta'" class="flex flex-wrap items-center gap-3 text-xs">
    <a
      :href="enlaceWhatsapp('Hola, tengo una duda sobre un pedido en la Tienda MCM.')"
      target="_blank"
      rel="noopener"
      class="flex items-center gap-1.5 transition hover:text-foreground"
    >
      <IconoWhatsapp class="size-5" />
      {{ telefonoFormateado() }}
    </a>
    <a :href="enlaceCorreo()" class="flex items-center gap-1.5 transition hover:text-foreground">
      <IconoCorreo class="size-5" />
      {{ EMAIL_CONTACTO }}
    </a>
  </div>

  <!-- Destacada: en las pantallas de confirmación, donde de verdad puede hacer falta -->
  <div v-else class="rounded-xl border border-border bg-card p-4">
    <p class="mb-3 text-sm font-medium">¿Necesitas algo?</p>
    <div class="grid gap-2 sm:grid-cols-2">
      <a
        :href="enlaceWhatsapp('Hola, tengo una duda sobre un pedido en la Tienda MCM.')"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-2.5 rounded-lg border border-border p-2.5 transition hover:border-primary hover:bg-primary/5"
      >
        <IconoWhatsapp class="size-8 shrink-0" />
        <span>
          <span class="block text-sm font-medium">WhatsApp</span>
          <span class="block text-xs text-muted-foreground">{{ telefonoFormateado() }}</span>
        </span>
      </a>
      <a
        :href="enlaceCorreo()"
        class="flex items-center gap-2.5 rounded-lg border border-border p-2.5 transition hover:border-primary hover:bg-primary/5"
      >
        <IconoCorreo class="size-8 shrink-0" />
        <span>
          <span class="block text-sm font-medium">Correo</span>
          <span class="block truncate text-xs text-muted-foreground">{{ EMAIL_CONTACTO }}</span>
        </span>
      </a>
    </div>
  </div>
</template>
