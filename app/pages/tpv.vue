<script setup lang="ts">
import type { ProductoCatalogo, VarianteCatalogo } from '~~/server/utils/catalogo'

/**
 * TPV del equipo: apuntar ventas en segundos.
 *
 * Toque en un producto → (talla) → nombre si se quiere → Registrar. El pedido
 * va a Holded con sus etiquetas y la pantalla queda lista para la siguiente
 * persona. Sirve igual para el puesto de un evento que para un pedido que
 * entra por teléfono: el evento se elige arriba, o "sin evento".
 *
 * En ordenador y en iPad horizontal el ticket es una columna fija a la
 * derecha; en móvil, una barra abajo que abre el ticket en una hoja.
 */
definePageMeta({ layout: false })
useSeoMeta({ title: 'TPV', robots: 'noindex, nofollow' })

const { data: sesion, refresh: refrescarSesion } = await useFetch('/api/tpv/sesion', {
  key: 'tpv-sesion',
})
const abierto = computed(() => !!sesion.value?.abierto)

// ── Entrar ─────────────────────────────────────────────────────────────────
const clave = ref('')
const entrando = ref(false)
const errorClave = ref<string | null>(null)

async function entrar() {
  if (entrando.value) return
  entrando.value = true
  errorClave.value = null
  try {
    await $fetch('/api/tpv/entrar', { method: 'POST', body: { clave: clave.value } })
    clave.value = ''
    await refrescarSesion()
    await cargarCatalogo()
  } catch (e) {
    errorClave.value = (e as { statusMessage?: string }).statusMessage ?? 'No se ha podido entrar.'
  } finally {
    entrando.value = false
  }
}

async function salirDelTpv() {
  await $fetch('/api/tpv/salir', { method: 'POST' }).catch(() => {})
  hojaVentas.value = false
  await refrescarSesion()
}

// ── Catálogo ───────────────────────────────────────────────────────────────
const productos = ref<ProductoCatalogo[]>([])
const cargando = ref(false)
const errorCatalogo = ref<string | null>(null)

async function cargarCatalogo() {
  if (!abierto.value) return
  cargando.value = true
  errorCatalogo.value = null
  try {
    const r = await $fetch<{ productos: ProductoCatalogo[] }>('/api/tpv/catalogo')
    productos.value = r.productos
  } catch (e) {
    errorCatalogo.value =
      (e as { statusMessage?: string }).statusMessage ?? 'No se ha podido cargar el catálogo.'
  } finally {
    cargando.value = false
  }
}

const busqueda = ref('')
const visibles = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return q ? productos.value.filter((p) => p.nombre.toLowerCase().includes(q)) : productos.value
})

// ── Venta ──────────────────────────────────────────────────────────────────
const v = useVentaTpv()
const eventos = eventosPublicados()

onMounted(() => {
  v.cargarLocal()
  cargarCatalogo()
})

const productoAbierto = ref<ProductoCatalogo | null>(null)
const hojaVariante = computed({
  get: () => productoAbierto.value !== null,
  set: (abierta) => {
    if (!abierta) productoAbierto.value = null
  },
})

/** Aviso corto de lo último que se ha sumado: confirma sin abrir el ticket. */
const aviso = ref<{ texto: string; vez: number } | null>(null)
let temporizadorAviso: ReturnType<typeof setTimeout> | undefined

function sumar(producto: ProductoCatalogo, variante: VarianteCatalogo | null) {
  v.anadir(producto, variante)
  aviso.value = {
    texto: `${producto.nombre}${variante ? ` · ${variante.etiqueta}` : ''}`,
    vez: (aviso.value?.vez ?? 0) + 1,
  }
  clearTimeout(temporizadorAviso)
  temporizadorAviso = setTimeout(() => (aviso.value = null), 1400)
}

function tocar(producto: ProductoCatalogo) {
  if (producto.variantes.length) productoAbierto.value = producto
  else sumar(producto, null)
}

function elegirVariante(variante: VarianteCatalogo) {
  if (productoAbierto.value) sumar(productoAbierto.value, variante)
  productoAbierto.value = null
}

const hojaTicket = ref(false)

/**
 * Alto real de la cabecera, para que el ticket fijo de la derecha empiece justo
 * debajo: cambia cuando aparece la fila de "Entra por" (venta sin evento).
 */
const cabecera = ref<HTMLElement | null>(null)
const altoCabecera = ref(52)
let observador: ResizeObserver | undefined
watch(cabecera, (el) => {
  observador?.disconnect()
  if (!el) return
  observador = new ResizeObserver(() => (altoCabecera.value = el.offsetHeight))
  observador.observe(el)
})
onBeforeUnmount(() => observador?.disconnect())

// ── Ventas de hoy en este dispositivo ──────────────────────────────────────
const hojaVentas = ref(false)
const hoy = hoyEnEspana()
const ventasHoy = computed(() => v.ventas.value.filter((x) => hoyEnEspana(new Date(x.hora)) === hoy))

const resumen = computed(() => {
  const r = { efectivo: 0, bizum: 0, tarjeta: 0, pendiente: 0, total: 0, reservadas: 0 }
  for (const x of ventasHoy.value) {
    r[x.pago] += x.totalCentimos
    r.total += x.totalCentimos
    if (x.entrega === 'reservado') r.reservadas++
  }
  return r
})

const TEXTO_PAGO = { efectivo: 'Efectivo', bizum: 'Bizum', tarjeta: 'Tarjeta', pendiente: 'Sin cobrar' }

function horaCorta(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function imagenDe(p: ProductoCatalogo): string | null {
  return p.imagenes[0]?.miniatura ?? null
}

function stockTexto(p: ProductoCatalogo): string {
  if (p.stock <= 0) return 'sin stock'
  return `${p.stock} en stock`
}
</script>

<template>
  <div class="min-h-dvh bg-background">
    <!-- ── Puerta: clave del equipo ─────────────────────────────────────── -->
    <main v-if="!abierto" class="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-12">
      <div class="mcm-animar-entrada flex items-center gap-3">
        <LogoMCM class="size-12 shrink-0" />
        <div>
          <h1 class="text-2xl font-semibold">TPV</h1>
          <p class="text-sm text-muted-foreground">Ventas rápidas del equipo</p>
        </div>
      </div>

      <p v-if="sesion && !sesion.configurado" class="mcm-animar-entrada mt-8 rounded-lg bg-warn/10 px-4 py-3 text-sm text-warn" style="animation-delay: 60ms">
        El TPV está cerrado: falta poner su clave en Vercel (<code>NUXT_TPV_CLAVE</code>).
      </p>

      <form v-else class="mcm-animar-entrada mt-8 space-y-3" style="animation-delay: 60ms" @submit.prevent="entrar">
        <label class="block">
          <span class="mb-1 block text-sm font-medium">Clave del TPV</span>
          <input
            v-model="clave"
            type="password"
            inputmode="numeric"
            autocomplete="current-password"
            autofocus
            required
            class="w-full rounded-lg border border-border bg-card px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] outline-none focus:border-primary"
          />
        </label>
        <p v-if="errorClave" class="text-sm text-warn" role="alert">{{ errorClave }}</p>
        <button
          type="submit"
          :disabled="entrando || !clave"
          class="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
        >
          <span v-if="entrando" class="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" aria-hidden="true" />
          Entrar
        </button>
        <p class="text-xs text-muted-foreground">
          Este dispositivo se queda dentro 30 días. Si es un móvil prestado, sal al terminar.
        </p>
      </form>

      <NuxtLink to="/" class="mt-10 text-sm text-muted-foreground underline-offset-2 hover:underline">
        Volver a la tienda
      </NuxtLink>
    </main>

    <!-- ── TPV ──────────────────────────────────────────────────────────── -->
    <template v-else>
      <header ref="cabecera" class="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div class="flex items-center gap-2 px-4 py-2.5 sm:gap-3">
          <LogoMCM class="size-8 shrink-0" />
          <span class="mr-1 font-semibold">TPV</span>

          <label class="min-w-0 flex-1 sm:flex-none">
            <span class="sr-only">Evento</span>
            <select
              v-model="v.eventoId.value"
              class="w-full max-w-72 truncate rounded-lg border border-border bg-card px-2.5 py-1.5 text-base font-medium outline-none focus:border-primary sm:text-sm"
            >
              <option v-for="e in eventos" :key="e.id" :value="e.id">
                {{ e.nombre }}{{ e.lugar ? ` · ${e.lugar}` : '' }}
              </option>
              <option value="">Sin evento (teléfono, oficina…)</option>
            </select>
          </label>

          <button
            type="button"
            class="ml-auto flex shrink-0 items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm transition hover:border-muted-foreground"
            @click="hojaVentas = true"
          >
            <span class="font-semibold tabular-nums">{{ ventasHoy.length }}</span>
            <span class="hidden text-muted-foreground sm:inline">ventas hoy ·</span>
            <span class="font-semibold tabular-nums sm:hidden">·</span>
            <span class="tabular-nums">{{ formatearImporte(resumen.total) }}</span>
          </button>
        </div>

        <!-- Sin evento: por dónde ha entrado la venta, para filtrar luego en Holded -->
        <div v-if="!v.eventoId.value" class="flex items-center gap-2 px-4 pb-2.5 text-sm">
          <span class="text-muted-foreground">Entra por</span>
          <div class="flex items-center rounded-lg border border-border p-0.5" role="radiogroup" aria-label="Canal de la venta">
            <button
              v-for="c in (['telefono', 'otro'] as const)"
              :key="c"
              type="button"
              role="radio"
              :aria-checked="v.canal.value === c"
              class="rounded-md px-3 py-1 transition"
              :class="v.canal.value === c ? 'bg-primary/10 font-semibold' : 'text-muted-foreground'"
              @click="v.canal.value = c"
            >
              {{ c === 'telefono' ? 'Teléfono' : 'Otro' }}
            </button>
          </div>
        </div>
      </header>

      <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_25rem]">
        <!-- Productos -->
        <main class="px-4 pt-4 pb-32 lg:pb-8">
          <input
            v-if="productos.length > 8"
            v-model="busqueda"
            type="search"
            placeholder="Buscar producto"
            aria-label="Buscar producto"
            class="mb-4 w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-base outline-none placeholder:text-muted-foreground focus:border-primary"
          />

          <p v-if="errorCatalogo" class="rounded-lg bg-warn/10 px-4 py-3 text-sm text-warn">
            {{ errorCatalogo }}
            <button type="button" class="ml-1 font-medium underline" @click="cargarCatalogo">Reintentar</button>
          </p>

          <!-- Esqueleto sólo en la primera carga, con la forma de las tarjetas -->
          <div v-else-if="cargando && !productos.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            <div v-for="i in 6" :key="i" class="aspect-[4/5] animate-pulse rounded-xl border border-border bg-card" />
          </div>

          <ul v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            <li v-for="(p, i) in visibles" :key="p.id" class="mcm-animar-entrada" :style="{ animationDelay: `${Math.min(i, 10) * 30}ms` }">
              <button
                type="button"
                class="relative flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card text-left transition active:scale-[0.98]"
                :class="v.enTicket(p.id) ? 'border-primary' : 'border-border hover:border-muted-foreground'"
                :aria-label="`${p.nombre}, ${formatearEuros(p.precioCentimos)}${p.variantes.length ? ', elegir opción' : ', añadir'}${v.enTicket(p.id) ? `. En el ticket: ${v.enTicket(p.id)}` : ''}`"
                @click="tocar(p)"
              >
                <!--
                  Imagen absoluta: en una columna flex, `aspect-ratio` cede ante
                  la altura natural de la foto y una foto vertical estiraba la
                  tarjeta. Así todas miden lo mismo y la rejilla no baila.
                -->
                <span class="relative block aspect-[4/3] shrink-0 overflow-hidden bg-background">
                  <img
                    v-if="imagenDe(p)"
                    :src="imagenDe(p)!"
                    alt=""
                    loading="lazy"
                    class="absolute inset-0 size-full object-cover"
                  />
                  <span v-else class="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <IconoOtros class="size-12 opacity-60" />
                  </span>
                  <span
                    v-if="v.enTicket(p.id)"
                    :key="v.ultimoSumado.value?.id === p.id ? v.ultimoSumado.value.vez : 0"
                    class="mcm-tpv-salto absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground tabular-nums"
                  >
                    {{ v.enTicket(p.id) }}
                  </span>
                </span>
                <span class="flex flex-1 flex-col p-3">
                  <span class="text-sm leading-snug font-medium">{{ p.nombre }}</span>
                  <span class="mt-auto flex items-baseline justify-between gap-2 pt-1.5">
                    <span class="font-semibold tabular-nums">{{ formatearEuros(p.precioCentimos) }}</span>
                    <span class="text-xs tabular-nums" :class="p.stock > 0 ? 'text-muted-foreground' : 'text-warn'">
                      {{ stockTexto(p) }}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </main>

        <!-- Ticket fijo en pantallas anchas -->
        <aside
          :style="{ top: `${altoCabecera}px`, height: `calc(100dvh - ${altoCabecera}px)` }"
          class="sticky hidden self-start flex-col border-l border-border bg-card p-4 lg:flex">
          <div class="mb-3 flex items-baseline justify-between">
            <h2 class="font-semibold">Venta</h2>
            <span class="text-sm text-muted-foreground tabular-nums">
              {{ v.unidades.value }} {{ v.unidades.value === 1 ? 'unidad' : 'unidades' }}
            </span>
          </div>
          <TpvPanelVenta class="min-h-0 flex-1" />
        </aside>
      </div>

      <!-- Barra inferior en móvil y tableta vertical -->
      <div class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <button
          type="button"
          :disabled="!v.lineas.value.length"
          class="flex h-14 w-full items-center justify-between gap-3 rounded-lg bg-primary px-4 text-primary-foreground transition hover:bg-primary-hover disabled:bg-background disabled:text-muted-foreground"
          @click="hojaTicket = true"
        >
          <template v-if="v.lineas.value.length">
            <span class="text-sm">
              <span class="font-semibold tabular-nums">{{ v.unidades.value }}</span>
              {{ v.unidades.value === 1 ? 'unidad' : 'unidades' }}
            </span>
            <span class="text-base font-semibold">
              Cobrar · <span class="tabular-nums">{{ formatearImporte(v.totalCentimos.value) }}</span>
            </span>
          </template>
          <span v-else class="w-full text-center text-sm">Toca un producto para empezar</span>
        </button>
      </div>

      <HojaInferior v-model="hojaTicket" titulo="Venta">
        <TpvPanelVenta @registrada="hojaTicket = false" />
      </HojaInferior>

      <HojaInferior v-model="hojaVariante" :titulo="productoAbierto?.nombre ?? ''">
        <TpvSelectorVariante v-if="productoAbierto" :producto="productoAbierto" @elegir="elegirVariante" />
      </HojaInferior>

      <HojaInferior v-model="hojaVentas" titulo="Ventas de hoy en este dispositivo" ancho="ancho">
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div v-for="m in (['efectivo', 'bizum', 'tarjeta', 'pendiente'] as const)" :key="m" class="rounded-lg border border-border bg-background p-3">
            <p class="text-xs text-muted-foreground">{{ TEXTO_PAGO[m] }}</p>
            <p class="mt-0.5 text-lg font-semibold tabular-nums" :class="{ 'text-warn': m === 'pendiente' && resumen.pendiente > 0 }">
              {{ formatearImporte(resumen[m]) }}
            </p>
          </div>
        </div>
        <p class="mt-3 text-sm text-muted-foreground">
          {{ ventasHoy.length }} {{ ventasHoy.length === 1 ? 'venta' : 'ventas' }} ·
          {{ formatearImporte(resumen.total) }} en total<template v-if="resumen.reservadas">
            · {{ resumen.reservadas }} {{ resumen.reservadas === 1 ? 'reservada' : 'reservadas' }} por entregar</template>.
          Sólo las apuntadas desde aquí; todas están en Holded con la etiqueta <code>tpv</code>.
        </p>

        <ul v-if="ventasHoy.length" class="mt-4 divide-y divide-border">
          <li v-for="x in ventasHoy" :key="`${x.numero}-${x.hora}`" class="flex items-center gap-3 py-2.5 text-sm">
            <span class="w-12 shrink-0 font-mono font-semibold tabular-nums">{{ x.numero }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium">{{ x.nombre }}</span>
              <span class="block text-xs text-muted-foreground">
                {{ horaCorta(x.hora) }} · {{ x.unidades }} {{ x.unidades === 1 ? 'unidad' : 'uds.' }}
              </span>
            </span>
            <span class="hidden shrink-0 rounded-full border border-border px-2 py-0.5 text-xs sm:inline" :class="{ 'border-warn/50 text-warn': x.pago === 'pendiente' }">
              {{ TEXTO_PAGO[x.pago] }}
            </span>
            <span v-if="x.entrega === 'reservado'" class="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs">
              Reservado
            </span>
            <span class="w-16 shrink-0 text-right font-semibold tabular-nums">{{ formatearImporte(x.totalCentimos) }}</span>
          </li>
        </ul>
        <p v-else class="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Todavía no has apuntado ninguna venta hoy desde este dispositivo.
        </p>

        <template #pie>
          <button type="button" class="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" @click="salirDelTpv">
            Salir del TPV en este dispositivo
          </button>
        </template>
      </HojaInferior>

      <!-- Lo último que se ha sumado -->
      <div class="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 lg:bottom-6 lg:justify-start lg:pl-6" aria-live="polite">
        <p
          v-if="aviso"
          :key="aviso.vez"
          class="mcm-animar-entrada max-w-full truncate rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <span class="font-semibold text-primary">+1</span> {{ aviso.texto }}
        </p>
      </div>

      <!-- Venta registrada: aparece un segundo y se va sola -->
      <div class="pointer-events-none fixed inset-x-0 top-16 z-[60] flex justify-center px-4" aria-live="assertive">
        <div
          v-if="v.hecho.value"
          :key="v.hecho.value.numero"
          class="mcm-tpv-hecho flex items-center gap-4 rounded-xl border border-primary/40 bg-card px-5 py-4 shadow-lg"
        >
          <span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <span>
            <span class="block text-xs text-muted-foreground">Venta registrada</span>
            <span class="block text-xl font-bold">
              Nº <span class="font-mono tabular-nums">{{ v.hecho.value.numero }}</span>
            </span>
            <span class="block text-sm text-muted-foreground">
              {{ v.hecho.value.nombre || 'Sin nombre' }} · <span class="tabular-nums">{{ formatearImporte(v.hecho.value.totalCentimos) }}</span>
            </span>
          </span>
        </div>
      </div>
    </template>
  </div>
</template>
