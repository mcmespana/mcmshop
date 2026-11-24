<script setup lang="ts">
/**
 * Hoja que sube desde abajo en móvil y diálogo centrado a partir de `sm`.
 *
 * En el TPV se usa con una mano y con prisa: abajo es donde llega el pulgar.
 * En un ordenador, una hoja pegada al borde inferior de una pantalla de 27"
 * queda lejísimos, así que ahí se centra.
 *
 * Accesible lo justo y necesario (design.md §3.7): es un `dialog` con nombre,
 * Escape cierra, el foco entra al abrir y vuelve a donde estaba al cerrar.
 * El velo lleva el desenfoque de 2 px que el sistema reserva para los modales.
 */
const abierta = defineModel<boolean>({ required: true })
const props = defineProps<{ titulo: string; ancho?: 'normal' | 'ancho' }>()

const panel = ref<HTMLElement | null>(null)
let focoAnterior: HTMLElement | null = null

watch(abierta, async (v) => {
  if (v) {
    focoAnterior = document.activeElement as HTMLElement | null
    await nextTick()
    const primero = panel.value?.querySelector<HTMLElement>(
      '[autofocus], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    primero?.focus({ preventScroll: true })
  } else {
    focoAnterior?.focus?.({ preventScroll: true })
  }
})

function alPulsar(e: KeyboardEvent) {
  if (e.key === 'Escape' && abierta.value) abierta.value = false
}
onMounted(() => window.addEventListener('keydown', alPulsar))
onBeforeUnmount(() => window.removeEventListener('keydown', alPulsar))

const idTitulo = useId()
</script>

<template>
  <Teleport to="body">
    <Transition name="mcm-hoja">
      <div v-if="abierta" class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
        <div class="mcm-velo absolute inset-0" aria-hidden="true" @click="abierta = false" />
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="idTitulo"
          class="mcm-hoja-panel relative flex max-h-[92dvh] w-full flex-col rounded-t-xl border border-border bg-card sm:rounded-xl"
          :class="props.ancho === 'ancho' ? 'sm:max-w-2xl' : 'sm:max-w-md'"
        >
          <!-- Asa: dice "esto se puede bajar" sin escribirlo -->
          <div class="flex justify-center pt-2 sm:hidden" aria-hidden="true">
            <span class="h-1 w-10 rounded-full bg-border" />
          </div>
          <div class="flex items-center gap-3 px-4 pt-2 pb-3 sm:pt-4">
            <h2 :id="idTitulo" class="mr-auto text-base font-semibold">{{ titulo }}</h2>
            <button
              type="button"
              class="toque flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-background hover:text-foreground"
              aria-label="Cerrar"
              @click="abierta = false"
            >
              <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <slot />
          </div>
          <div v-if="$slots.pie" class="border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <slot name="pie" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
