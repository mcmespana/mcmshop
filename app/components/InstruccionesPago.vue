<script setup lang="ts">
/**
 * Qué tiene que hacer la persona después de pedir, según cómo vaya a pagar.
 *
 * Los tres caminos son distintos de verdad, no un matiz de redacción:
 *  - tarjeta: ya está cobrado, no hay nada que hacer. Sólo tranquilizar.
 *  - bizum: puede pagar ahora mismo, así que el código va grande y a un toque.
 *  - transferencia: el importe final puede cambiar (mensajería, descuentos), así
 *    que lo que se promete es que escribimos nosotros, no que pague ya.
 */
defineProps<{
  metodo: 'bizum' | 'transferencia' | 'tarjeta'
  /** Nombre de quien paga, para sugerir un concepto reconocible. Con tarjeta no hay nada que poner. */
  concepto?: string
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
  <div class="rounded-xl border border-border bg-card p-4">
    <!-- Bizum: lo único que importa aquí es el código, así que manda el código -->
    <div v-if="metodo === 'bizum'">
      <div class="flex items-center gap-3">
        <IconoBizum class="size-10 shrink-0" />
        <div class="min-w-0">
          <p class="font-medium">Paga con Bizum</p>
          <p class="text-sm text-muted-foreground">
            En tu banco: Bizum → <strong class="font-medium text-foreground">Donativos / ONG</strong>
          </p>
        </div>
      </div>

      <button
        type="button"
        class="group mt-4 block w-full rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-5 text-center transition hover:border-primary hover:bg-primary/10"
        :aria-label="`Copiar el código de Bizum ${CODIGO_BIZUM_ONG}`"
        @click="copiar(CODIGO_BIZUM_ONG)"
      >
        <span class="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Código de la ONG
        </span>
        <span
          class="mt-1 block font-mono text-5xl font-bold leading-none tracking-[0.2em] text-primary"
        >
          {{ CODIGO_BIZUM_ONG }}
        </span>
        <span
          class="mt-3 inline-block rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition group-hover:text-foreground"
        >
          {{ copiado ? '¡Copiado!' : 'Tocar para copiar' }}
        </span>
      </button>

      <p v-if="concepto" class="mt-3 text-xs text-muted-foreground">
        Pon <strong class="font-medium text-foreground">{{ concepto }}</strong> como concepto, para
        que sepamos que es tuyo.
      </p>
    </div>

    <!-- Transferencia: no le pedimos que pague ya, le decimos cuándo le escribimos -->
    <div v-else-if="metodo === 'transferencia'">
      <div class="flex items-center gap-3">
        <IconoTransferencia class="size-10 shrink-0" />
        <div class="min-w-0">
          <p class="font-medium">Pago por transferencia</p>
          <p class="text-sm text-muted-foreground">
            Te escribimos en
            <strong class="font-medium text-foreground">
              menos de {{ HORAS_RESPUESTA_TRANSFERENCIA }} horas
            </strong>
            con el importe final y la referencia.
          </p>
        </div>
      </div>

      <details class="mt-3 text-sm">
        <summary class="cursor-pointer text-muted-foreground underline-offset-2 hover:underline">
          Prefiero ir adelantándolo
        </summary>
        <button
          type="button"
          class="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm font-semibold tracking-wide transition hover:border-primary"
          :aria-label="`Copiar el IBAN ${IBAN_TRANSFERENCIA}`"
          @click="copiar(IBAN_TRANSFERENCIA)"
        >
          {{ IBAN_TRANSFERENCIA }}
          <span class="shrink-0 text-xs font-normal text-muted-foreground">
            {{ copiado ? '¡Copiado!' : 'Copiar' }}
          </span>
        </button>
        <p v-if="concepto" class="mt-2 text-xs text-muted-foreground">
          Como concepto, pon <strong class="font-medium text-foreground">{{ concepto }}</strong
          >.
        </p>
      </details>
    </div>

    <!-- Tarjeta: ya está cobrado. No hay instrucciones, hay tranquilidad -->
    <div v-else class="flex items-center gap-3">
      <IconoTarjeta class="size-10 shrink-0" />
      <div class="min-w-0">
        <p class="font-medium">Pagado con tarjeta</p>
        <p class="text-sm text-muted-foreground">
          Ya está todo. No tienes que hacer nada más: nos ponemos con tu pedido.
        </p>
      </div>
    </div>
  </div>
</template>
