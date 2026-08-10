<script setup lang="ts">
import type { ProductoCatalogo } from '~~/server/utils/catalogo'

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

const productos = computed(() => {
  const todos = data.value?.productos ?? []
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return todos
  return todos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(q) ||
      p.descripcion?.toLowerCase().includes(q) ||
      p.variantes.some((v) => v.etiqueta.toLowerCase().includes(q)),
  )
})

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
        <div class="mb-5 flex items-center gap-3">
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
          <TarjetaProducto v-for="p in productos" :key="p.id" :producto="p" />
        </div>
      </div>

      <PanelCarrito />
    </div>
  </main>
</template>
