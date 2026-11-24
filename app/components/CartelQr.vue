<script setup lang="ts">
import { renderSVG } from 'uqr'

/**
 * El QR que se enseña en el puesto (o se imprime y se pega) para que la gente
 * lo escanee y pida desde su móvil: lleva a `/evento/<id>`, que deja el móvil
 * en modo evento y abre el catálogo.
 *
 * El QR va negro sobre blanco aunque la app esté en oscuro, a propósito: es lo
 * que leen sin fallar todas las cámaras, con brillo bajo y con reflejos. Es la
 * misma excepción que un logo (design.md §3.1): un activo, no interfaz.
 */
const props = defineProps<{
  url: string
  titulo: string
  subtitulo?: string | null
}>()

const svg = computed(() =>
  renderSVG(props.url, { ecc: 'M', border: 2, blackColor: '#161310', whiteColor: '#ffffff' }),
)

/** El enlace sin `https://`, para que se pueda teclear si la cámara no quiere. */
const enlaceCorto = computed(() => props.url.replace(/^https?:\/\//, ''))

const copiado = ref(false)
let temporizador: ReturnType<typeof setTimeout> | undefined
async function copiar() {
  try {
    await navigator.clipboard.writeText(props.url)
    copiado.value = true
    clearTimeout(temporizador)
    temporizador = setTimeout(() => (copiado.value = false), 1600)
  } catch {
    // Sin permiso de portapapeles: el enlace sigue escrito debajo del QR.
  }
}
onBeforeUnmount(() => clearTimeout(temporizador))

function escapar(texto: string) {
  return texto.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}

/**
 * Cartel A4 para imprimir: se abre en una ventana aparte con su propio HTML,
 * en vez de pelearse con estilos de impresión de toda la app. Colores escritos
 * a mano porque es papel: no hay tema que valga.
 */
function imprimir() {
  const ventana = window.open('', '_blank')
  if (!ventana) return
  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${escapar(props.titulo)} · Pide aquí</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; color: #161310; text-align: center; margin: 0; }
  .eyebrow { font-size: 14pt; letter-spacing: .08em; text-transform: uppercase; color: #13684b; font-weight: 700; margin: 8mm 0 2mm; }
  h1 { font-size: 40pt; margin: 0; line-height: 1.05; }
  .sub { font-size: 16pt; color: #6b6a66; margin: 3mm 0 0; }
  .qr { width: 120mm; margin: 10mm auto 6mm; }
  .qr svg { width: 100%; height: auto; display: block; }
  .pasos { font-size: 15pt; line-height: 1.5; margin: 0 auto; max-width: 150mm; }
  .url { font-family: Menlo, monospace; font-size: 12pt; color: #6b6a66; margin-top: 6mm; }
</style></head><body>
  <p class="eyebrow">Tienda MCM</p>
  <h1>Pide aquí</h1>
  <p class="sub">${escapar(props.titulo)}${props.subtitulo ? ` · ${escapar(props.subtitulo)}` : ''}</p>
  <div class="qr">${svg.value}</div>
  <p class="pasos">Escanea con la cámara, elige lo que quieres y enséñanos el tique en el puesto.</p>
  <p class="url">${escapar(enlaceCorto.value)}</p>
  <script>window.onload = () => { window.print() }<\/script>
</body></html>`)
  ventana.document.close()
}
</script>

<template>
  <div class="text-center">
    <p class="text-xs font-semibold tracking-wide text-primary uppercase">Pide aquí</p>
    <p class="mt-1 text-lg leading-tight font-semibold text-balance">{{ titulo }}</p>
    <p v-if="subtitulo" class="text-sm text-muted-foreground">{{ subtitulo }}</p>

    <!-- Marco blanco siempre: el QR necesita su margen claro para leerse -->
    <div
      class="mcm-animar-entrada mx-auto mt-4 w-full max-w-72 rounded-xl border border-border bg-white p-3 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
      role="img"
      :aria-label="`Código QR que abre ${enlaceCorto}`"
      v-html="svg"
    />

    <p class="mt-3 text-sm text-muted-foreground text-pretty">
      Que lo escaneen con la cámara: eligen, piden y te enseñan el tique.
    </p>
    <p class="mt-1 font-mono text-xs break-all text-muted-foreground">{{ enlaceCorto }}</p>

    <div class="mt-4 grid grid-cols-2 gap-2">
      <button
        type="button"
        class="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover"
        @click="imprimir"
      >
        <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 9V3h12v6" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" rx="1" />
        </svg>
        Imprimir cartel
      </button>
      <button
        type="button"
        class="flex h-11 items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold transition hover:border-muted-foreground"
        @click="copiar"
      >
        <svg v-if="!copiado" viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
        <svg v-else viewBox="0 0 24 24" class="size-4 text-primary" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        {{ copiado ? 'Copiado' : 'Copiar enlace' }}
      </button>
    </div>
  </div>
</template>
