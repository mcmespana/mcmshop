<script setup lang="ts">
import type { ProductoCatalogo } from '~~/server/utils/catalogo'
import IconoCamiseta from '~/components/IconoCamiseta.vue'
import IconoSudadera from '~/components/IconoSudadera.vue'
import IconoPanuelo from '~/components/IconoPanuelo.vue'
import IconoOtros from '~/components/IconoOtros.vue'

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
 * Categorías rápidas para el catálogo. Es un atajo visual, no un dato de Holded:
 * se detectan por el nombre del producto. Con 13 productos hoy no hace falta
 * más, y si algún día no encaja ninguno, cae en "Otros" en vez de desaparecer.
 */
const CATEGORIAS = [
  { id: 'camiseta', etiqueta: 'Camisetas', icono: IconoCamiseta, prueba: /camiseta/ },
  { id: 'sudadera', etiqueta: 'Sudaderas', icono: IconoSudadera, prueba: /sudadera/ },
  { id: 'panuelo', etiqueta: 'Pañuelos', icono: IconoPanuelo, prueba: /pa[nñ]uelo/ },
] as const

const categoria = ref<string | null>(null)

const categoriasConTotal = computed(() => {
  const todos = data.value?.productos ?? []
  const contadas = CATEGORIAS.map((c) => ({
    ...c,
    total: todos.filter((p) => c.prueba.test(normalizar(p.nombre))).length,
  })).filter((c) => c.total > 0)

  const totalOtros = todos.length - contadas.reduce((s, c) => s + c.total, 0)
  return totalOtros > 0
    ? [...contadas, { id: 'otros', etiqueta: 'Otros', icono: IconoOtros, total: totalOtros }]
    : contadas
})

const productos = computed(() => {
  let lista = data.value?.productos ?? []

  if (categoria.value) {
    const def = CATEGORIAS.find((c) => c.id === categoria.value)
    lista = def
      ? lista.filter((p) => def.prueba.test(normalizar(p.nombre)))
      : lista.filter((p) => !CATEGORIAS.some((c) => c.prueba.test(normalizar(p.nombre))))
  }

  const q = busqueda.value.trim().toLowerCase()
  if (!q) return lista
  return lista.filter(
    (p) =>
      p.nombre.toLowerCase().includes(q) ||
      p.descripcion?.toLowerCase().includes(q) ||
      p.variantes.some((v) => v.etiqueta.toLowerCase().includes(q)),
  )
})

function alternarCategoria(id: string) {
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
  description: 'Camisetas, sudaderas y pañuelos del Movimiento Consolación para el Mundo.',
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
        <div v-if="status !== 'pending' && productos.length > 0" class="mb-4 flex items-center gap-2 text-sm text-tinta-suave">
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
              class="w-full rounded-lg border border-borde bg-lienzo-alto py-2 pr-14 pl-3.5 text-sm outline-none placeholder:text-tinta-suave focus:border-acento"
            />
            <kbd
              class="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-borde px-1.5 py-0.5 text-[10px] text-tinta-suave sm:block"
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
              categoria === c.id
                ? 'border-acento bg-acento/10 font-medium text-acento-alto'
                : 'border-borde text-tinta-suave hover:border-tinta-suave hover:text-tinta'
            "
            @click="alternarCategoria(c.id)"
          >
            <component :is="c.icono" :activo="categoria === c.id" class="size-6" />
            {{ c.etiqueta }}
            <span class="text-xs text-tinta-suave">{{ c.total }}</span>
          </button>
        </div>

        <div v-if="status === 'pending'" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="n in 6"
            :key="n"
            class="aspect-[3/4] animate-pulse rounded-tarjeta border border-borde bg-lienzo-alto"
          />
        </div>

        <div
          v-else-if="productos.length === 0"
          class="rounded-tarjeta border border-borde bg-lienzo-alto px-4 py-12 text-center"
        >
          <IconoOtros class="mcm-rebote mx-auto mb-3 size-10 opacity-70" />
          <p class="font-medium">
            {{ busqueda ? 'No hay nada con ese nombre' : 'Todavía no hay nada por aquí' }}
          </p>
          <p class="mx-auto mt-1 max-w-md text-sm text-tinta-suave">
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

        <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <TarjetaProducto v-for="(p, i) in productos" :key="p.id" :producto="p" :indice="i" />
        </div>
      </div>

      <PanelCarrito />
    </div>
  </main>
</template>
