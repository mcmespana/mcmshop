<script setup lang="ts">
const props = defineProps<{
  metodo: 'bizum' | 'transferencia'
  /** Nombre de quien paga, para sugerir un concepto reconocible. */
  concepto: string
}>()

const copiado = ref(false)
let temporizador: ReturnType<typeof setTimeout> | undefined

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto.replace(/\s/g, ''))
  } catch {
    // Sin permiso de portapapeles: el dato sigue visible en pantalla para copiarlo a mano.
    return
  }
  copiado.value = true
  clearTimeout(temporizador)
  temporizador = setTimeout(() => (copiado.value = false), 1800)
}

onBeforeUnmount(() => clearTimeout(temporizador))
</script>

<template>
  <div class="rounded-tarjeta border border-borde bg-lienzo-alto p-4">
    <div v-if="metodo === 'bizum'" class="flex items-start gap-3">
      <IconoBizum class="size-10 shrink-0" />
      <div class="min-w-0 flex-1">
        <p class="font-medium">Bizum a nuestro código de ONG</p>
        <p class="mt-1 text-sm text-tinta-suave">
          En tu app del banco: Bizum → Donativos / ONG → busca el código
          <strong class="font-medium text-tinta">Movimiento Consolación</strong>.
        </p>

        <button
          type="button"
          class="mt-3 flex items-center gap-2 rounded-lg border border-borde bg-lienzo px-3 py-2 font-mono text-lg font-semibold tracking-wider transition hover:border-acento"
          @click="copiar(CODIGO_BIZUM_ONG)"
        >
          {{ CODIGO_BIZUM_ONG }}
          <span class="text-xs font-normal text-tinta-suave">
            {{ copiado ? '¡Copiado!' : 'Copiar' }}
          </span>
        </button>

        <p class="mt-2 text-xs text-tinta-suave">
          Como concepto, pon <strong>{{ concepto }}</strong
          >.
        </p>
      </div>
    </div>

    <div v-else class="flex items-start gap-3">
      <IconoTransferencia class="size-10 shrink-0" />
      <div class="min-w-0 flex-1">
        <p class="font-medium">Transferencia bancaria</p>
        <p class="mt-1 text-sm text-tinta-suave">A esta cuenta:</p>

        <button
          type="button"
          class="mt-3 flex w-full items-center justify-between gap-2 rounded-lg border border-borde bg-lienzo px-3 py-2 font-mono text-sm font-semibold tracking-wide transition hover:border-acento sm:text-base"
          @click="copiar(IBAN_TRANSFERENCIA)"
        >
          {{ IBAN_TRANSFERENCIA }}
          <span class="shrink-0 text-xs font-normal text-tinta-suave">
            {{ copiado ? '¡Copiado!' : 'Copiar' }}
          </span>
        </button>

        <p class="mt-2 text-xs text-tinta-suave">
          Como concepto, pon <strong>{{ concepto }}</strong
          >.
        </p>
      </div>
    </div>
  </div>
</template>
