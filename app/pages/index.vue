<script setup lang="ts">
import type { ProductoCatalogo } from '~~/server/utils/catalogo'
import IconoCamiseta from '~/components/IconoCamiseta.vue'
import IconoSudadera from '~/components/IconoSudadera.vue'
import IconoPanuelo from '~/components/IconoPanuelo.vue'
import IconoOtros from '~/components/IconoOtros.vue'
import type { Component } from 'vue'

const { modo } = useModo()

interface RespuestaCatalogo {
  modo: string
  productos: ProductoCatalogo[]
  generadoEn: string
  diagnostico: { sinEtiquetar: boolean; excluidos: Array<{ nombre: string; motivo: string }> }
}

// El catálogo se recarga al cambiar de modo: cada público ve lo suyo.
const { data, status } = await useFetch<RespuestaCatalogo>('/api/catalogo', {
  query: { modo },
})

const busqueda = ref('')

/** Minúsculas y sin acentos, para no fallar por "pañuelo" vs "panuelo". */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Categorías del catálogo: los drops por tag, el resto por el nombre del
 * producto (ver shared/utils/categorias.ts). El servidor ya manda los
 * productos ordenados, en el orden de cada público.
 */
const ICONOS: Record<IdCategoria, Component> = {
  drop: IconoCamiseta,
  panuelo: IconoPanuelo,
  camiseta: IconoCamiseta,
  sudadera: IconoSudadera,
  otros: IconoOtros,
}

/** Icono de la cabecera de cada sección (la de los drops no lleva: lleva la marca). */
const ICONOS_SECCION: Record<Exclude<IdSeccion, 'drop'>, Component> = {
  panuelo: IconoPanuelo,
  ropa: IconoCamiseta,
  otros: IconoOtros,
}

const categoria = ref<IdCategoria | null>(null)

interface GrupoDrop {
  clave: string
  info: InfoDrop
  productos: ProductoCatalogo[]
}

/**
 * Las secciones con lo que hay en cada una, en el orden en que llegan. Camisetas
 * y sudaderas comparten sección (ver seccionDe). La de los drops, además, va
 * partida por drop: cada tanda con su número.
 */
const secciones = computed(() => {
  const grupos = new Map<IdSeccion, { seccion: Seccion; productos: ProductoCatalogo[]; drops: GrupoDrop[] }>()
  for (const p of data.value?.productos ?? []) {
    const sec = seccionDe(categoriaDe(p).id)
    if (!grupos.has(sec.id)) grupos.set(sec.id, { seccion: sec, productos: [], drops: [] })
    const g = grupos.get(sec.id)!
    g.productos.push(p)
    if (sec.id === 'drop') {
      const info = dropDe(p) ?? { numero: null, nombre: null }
      const clave = info.numero ?? '—'
      let d = g.drops.find((x) => x.clave === clave)
      if (!d) g.drops.push((d = { clave, info, productos: [] }))
      if (!d.info.nombre && info.nombre) d.info = info
      d.productos.push(p)
    }
  }
  return [...grupos.values()]
})

/** Los chips sí separan camisetas de sudaderas: para filtrar es lo útil. */
const categoriasConTotal = computed(() => {
  const totales = new Map<IdCategoria, number>()
  for (const p of data.value?.productos ?? []) {
    const id = categoriaDe(p).id
    totales.set(id, (totales.get(id) ?? 0) + 1)
  }
  return ordenDeCategorias(modo.value)
    .filter((id) => totales.has(id))
    .map((id) => ({
      id,
      etiqueta: categoriaPorId(id).etiqueta,
      icono: ICONOS[id],
      total: totales.get(id)!,
    }))
})

/** "001" → ["0", "0", "1"], para que cada cifra entre por su cuenta. */
function cifras(numero: string | null): string[] {
  return (numero ?? '').split('')
}

const productos = computed(() => {
  let lista = data.value?.productos ?? []

  if (categoria.value) {
    lista = lista.filter((p) => categoriaDe(p).id === categoria.value)
  }

  const q = normalizar(busqueda.value.trim())
  if (!q) return lista
  return lista.filter(
    (p) =>
      normalizar(p.nombre).includes(q) ||
      normalizar(p.descripcion ?? '').includes(q) ||
      p.variantes.some((v) => normalizar(v.etiqueta).includes(q)),
  )
})

/**
 * Sin filtro ni búsqueda, el catálogo se enseña por secciones con su título.
 * Filtrando, una sola rejilla: los títulos sobrarían.
 */
const porSecciones = computed(() => !categoria.value && !busqueda.value.trim())

/** Índice global de cada producto, para que la cascada siga entre secciones. */
const indiceDe = computed(() => {
  const mapa = new Map<string, number>()
  ;(data.value?.productos ?? []).forEach((p, i) => mapa.set(p.id, i))
  return mapa
})

function alternarCategoria(id: IdCategoria) {
  categoria.value = categoria.value === id ? null : id
}

const campoBusqueda = ref<HTMLInputElement | null>(null)

// ⌘K aunque el catálogo sea pequeño: cuesta poco y se nota.
function alPulsar(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    campoBusqueda.value?.focus()
  }
}
onMounted(() => window.addEventListener('keydown', alPulsar))
onBeforeUnmount(() => window.removeEventListener('keydown', alPulsar))

useSeoMeta({
  title: 'Catálogo',
  description: 'Drops MCM, camisetas, sudaderas y pañuelos del Movimiento Consolación para el Mundo.',
})
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6">
    <div class="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div>
        <!--
          Fila de bienvenida: sólo un icono con un rebote suave, para que la
          portada no sea únicamente una caja de búsqueda seria. El catálogo es
          pequeño, así que el sitio para "personalidad" está aquí arriba, no en
          una tarjeta más.
        -->
        <div v-if="status !== 'pending' && productos.length > 0" class="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <span class="mcm-rebote text-lg" aria-hidden="true">👋</span>
          <span>
            {{ (data?.productos.length ?? 0) }}
            {{ (data?.productos.length ?? 0) === 1 ? 'cosa' : 'cositas' }} esperándote
          </span>
        </div>

        <div class="mb-4 flex items-center gap-3">
          <div class="relative flex-1">
            <input
              ref="campoBusqueda"
              v-model="busqueda"
              type="search"
              placeholder="Buscar en el catálogo"
              aria-label="Buscar en el catálogo"
              class="w-full rounded-lg border border-border bg-card py-2 pr-14 pl-3.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <kbd
              class="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block"
            >
              ⌘K
            </kbd>
          </div>
        </div>

        <!-- Chips de categoría: un atajo visual, no un filtro de Holded. -->
        <div v-if="categoriasConTotal.length > 1" class="mb-5 flex flex-wrap gap-2">
          <button
            v-for="c in categoriasConTotal"
            :key="c.id"
            type="button"
            :aria-pressed="categoria === c.id"
            class="group flex items-center gap-2 rounded-full border py-1 pr-3.5 pl-1.5 text-sm transition"
            :class="
              c.id === 'drop'
                ? categoria === c.id
                  ? 'mcm-drop border-transparent pl-3.5 font-medium'
                  : 'border-foreground/70 pl-3.5 font-medium text-foreground hover:border-foreground'
                : categoria === c.id
                  ? 'border-primary bg-primary/10 font-medium text-primary-hover'
                  : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'
            "
            @click="alternarCategoria(c.id)"
          >
            <component
              :is="c.icono"
              v-if="c.id !== 'drop'"
              :activo="categoria === c.id"
              class="size-6"
            />
            <span v-if="c.id === 'drop'" class="mcm-drop-marca text-[11px]">{{ c.etiqueta }}</span>
            <template v-else>{{ c.etiqueta }}</template>
            <span class="text-xs text-muted-foreground">{{ c.total }}</span>
          </button>
        </div>

        <div v-if="status === 'pending'" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="n in 6"
            :key="n"
            class="aspect-[3/4] animate-pulse rounded-xl border border-border bg-card"
          />
        </div>

        <div
          v-else-if="productos.length === 0"
          class="rounded-xl border border-border bg-card px-4 py-12 text-center"
        >
          <IconoOtros class="mcm-rebote mx-auto mb-3 size-10 opacity-70" />
          <p class="font-medium">
            {{ busqueda ? 'No hay nada con ese nombre' : 'Todavía no hay nada por aquí' }}
          </p>
          <p class="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            <template v-if="busqueda">Prueba con otra palabra.</template>
            <!-- Aviso de configuración: al equipo, no al cliente. Que quede claro
                 que la tienda funciona y lo que falta es etiquetar en Holded. -->
            <template v-else-if="data?.diagnostico.sinEtiquetar">
              Ningún producto está etiquetado todavía como <code>b2b</code> o <code>b2c</code> en
              Holded, así que no sale ninguno. En cuanto etiquetéis uno, aparece aquí.
            </template>
            <template v-else>
              Ahora mismo no hay nada disponible para
              {{ modo === 'b2b' ? 'delegaciones' : 'pedidos personales' }}.
            </template>
          </p>
        </div>

        <!--
          Por secciones. Particulares: drops, camisetas y sudaderas, pañuelos, otros.
          Delegaciones: pañuelos, camisetas y sudaderas, otros, drops.
        -->
        <div v-else-if="porSecciones" class="space-y-10">
          <section v-for="s in secciones" :key="s.seccion.id" :aria-labelledby="`seccion-${s.seccion.id}`">
            <template v-if="s.seccion.id === 'drop'">
              <header class="mb-5">
                <div class="flex items-center gap-3">
                  <h2 :id="`seccion-${s.seccion.id}`" class="mcm-drop-marca shrink-0 text-sm">
                    Drops MCM
                  </h2>
                  <span class="mcm-drop-raya h-px flex-1 bg-foreground/25" aria-hidden="true" />
                </div>
                <p class="mt-1.5 text-sm text-muted-foreground">
                  Colecciones que salen por tandas. Para llevar el movimiento cualquier día.
                </p>
              </header>

              <div class="space-y-8">
                <div v-for="d in s.drops" :key="d.clave">
                  <!--
                    El número del drop entra cifra a cifra, como un marcador: es lo que
                    dice "esto es una tanda" sin explicarlo.
                  -->
                  <h3 v-if="d.info.numero" class="mb-3 flex items-center gap-2.5">
                    <span class="mcm-drop-sello">Drop</span>
                    <span class="mcm-drop-numero text-2xl leading-none font-semibold tabular-nums" :aria-label="d.info.numero">
                      <span
                        v-for="(c, i) in cifras(d.info.numero)"
                        :key="i"
                        class="mcm-drop-cifra"
                        aria-hidden="true"
                      ><span :style="{ animationDelay: `${180 + i * 70}ms` }">{{ c }}</span></span>
                    </span>
                    <span v-if="d.info.nombre" class="mcm-drop-nombre text-sm text-muted-foreground">
                      {{ d.info.nombre }}
                    </span>
                  </h3>
                  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <TarjetaProducto
                      v-for="p in d.productos"
                      :key="p.id"
                      :producto="p"
                      :indice="indiceDe.get(p.id) ?? 0"
                    />
                  </div>
                </div>
              </div>
            </template>

            <template v-else>
              <h2
                :id="`seccion-${s.seccion.id}`"
                class="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground"
              >
                <component :is="ICONOS_SECCION[s.seccion.id]" class="size-5" />
                {{ s.seccion.etiqueta }}
              </h2>
              <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <TarjetaProducto
                  v-for="p in s.productos"
                  :key="p.id"
                  :producto="p"
                  :indice="indiceDe.get(p.id) ?? 0"
                />
              </div>
            </template>
          </section>
        </div>

        <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <TarjetaProducto v-for="(p, i) in productos" :key="p.id" :producto="p" :indice="i" />
        </div>
      </div>

      <PanelCarrito />
    </div>
  </main>
</template>
