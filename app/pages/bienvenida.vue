<script setup lang="ts">
import type { Delegacion } from '~/composables/useModo'

const { elegirDelegacion, elegirPersonal, delegacion } = useModo()
const router = useRouter()

const { data } = await useFetch<{ delegaciones: Delegacion[] }>('/api/delegaciones')

const paso = ref<'inicio' | 'delegaciones'>('inicio')
const busqueda = ref('')
const cargandoDetalle = ref<string | null>(null)

const lista = computed(() => {
  const todas = data.value?.delegaciones ?? []
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return todas
  return todas.filter((d) => d.nombre.toLowerCase().includes(q))
})

/**
 * Al elegir una MCM Local se pide su ficha completa (email, dirección) antes de
 * entrar: así el checkout puede autorrellenar sin otra llamada de por medio.
 * El listado público sólo trae id y nombre a propósito, para no publicar de
 * golpe los diez correos de las MCM Locales.
 */
async function entrarComoDelegacion(elegida: Delegacion) {
  cargandoDetalle.value = elegida.id
  try {
    const detalle = await $fetch<Delegacion>(`/api/delegaciones/${elegida.id}`)
    elegirDelegacion(detalle)
  } catch {
    // Si la ficha falla, se entra igual con lo que ya se tenía: nombre e id.
    elegirDelegacion(elegida)
  }
  router.push('/')
}

function entrarComoPersona() {
  elegirPersonal()
  router.push('/')
}

// Sin cabecera ni carrito: es la puerta de entrada, no una página más.
definePageMeta({ layout: false })
useSeoMeta({ title: 'Bienvenido' })
</script>

<template>
  <div class="relative flex min-h-screen flex-col overflow-hidden bg-lienzo">
    <!--
      Decoración de fondo: iconos muy tenues, sólo textura, nunca legibles como
      contenido. Sin z negativo: el contenedor pinta `bg-lienzo`, así que un
      `-z-10` los dejaría por detrás de ese fondo y no se verían.
    -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <IconoCamiseta class="absolute -top-8 -right-10 size-56 rotate-12 opacity-10" />
      <IconoPanuelo class="absolute top-1/2 -left-16 size-48 -rotate-12 opacity-10" />
      <IconoSudadera class="absolute -bottom-14 right-1/4 size-52 rotate-6 opacity-10" />
    </div>

    <main class="relative mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-12">
      <div class="mcm-animar-entrada mb-8 flex items-center gap-4">
        <LogoMCM animado class="size-14 shrink-0" />
        <div>
          <h1 class="text-2xl font-semibold">Tienda MCM</h1>
          <p class="mt-0.5 text-sm text-tinta-suave">
            Materiales del Movimiento Consolación para el Mundo.
          </p>
        </div>
      </div>

      <!-- Paso 1: qué quiere ver -->
      <div v-if="paso === 'inicio'" class="space-y-3">
        <p class="mcm-animar-entrada text-sm font-medium" style="animation-delay: 60ms">
          ¿Qué quieres ver?
        </p>

        <button
          type="button"
          class="mcm-animar-entrada group flex w-full items-center gap-3.5 rounded-tarjeta border border-borde bg-lienzo-alto p-4 text-left transition hover:border-acento hover:bg-acento/5"
          style="animation-delay: 110ms"
          @click="paso = 'delegaciones'"
        >
          <IconoGrupo class="size-11 shrink-0 transition-transform group-hover:scale-110" />
          <span>
            <span class="block font-medium">Materiales para MCM Locales</span>
            <span class="mt-0.5 block text-sm text-tinta-suave">
              Pedido de grupo para tu MCM Local.
            </span>
          </span>
        </button>

        <button
          type="button"
          class="mcm-animar-entrada group flex w-full items-center gap-3.5 rounded-tarjeta border border-borde bg-lienzo-alto p-4 text-left transition hover:border-acento hover:bg-acento/5"
          style="animation-delay: 160ms"
          @click="entrarComoPersona"
        >
          <IconoPersona class="size-11 shrink-0 transition-transform group-hover:scale-110" />
          <span>
            <span class="block font-medium">Materiales para mí, a título personal</span>
            <span class="mt-0.5 block text-sm text-tinta-suave">
              Camisetas, sudaderas y más, para monitores o miembros del MCM.
            </span>
          </span>
        </button>

        <p class="mcm-animar-entrada pt-2 text-xs text-tinta-suave" style="animation-delay: 200ms">
          Puedes cambiarlo cuando quieras. Puedes mirar el catálogo sin hacer un pedido haciendo
          click en una de las opciones anteriores.
        </p>
      </div>

      <!-- Paso 2: qué MCM Local -->
      <div v-else class="space-y-3">
        <div class="flex items-baseline justify-between gap-2">
          <p class="text-sm font-medium">¿De qué MCM Local?</p>
          <button
            type="button"
            class="text-xs text-tinta-suave underline-offset-2 hover:underline"
            @click="paso = 'inicio'"
          >
            Volver
          </button>
        </div>

        <input
          v-if="(data?.delegaciones.length ?? 0) > 8"
          v-model="busqueda"
          type="search"
          placeholder="Buscar tu localidad"
          aria-label="Buscar tu localidad"
          class="w-full rounded-lg border border-borde bg-lienzo-alto px-3.5 py-2.5 text-sm outline-none placeholder:text-tinta-suave focus:border-acento"
        />

        <ul v-if="lista.length" class="grid gap-2 sm:grid-cols-2">
          <li v-for="d in lista" :key="d.id">
            <button
              type="button"
              :disabled="cargandoDetalle !== null"
              class="flex w-full items-center justify-between gap-2 rounded-lg border p-3 text-left text-sm font-medium transition disabled:opacity-60"
              :class="delegacion?.id === d.id ? 'border-acento bg-acento/5' : 'border-borde hover:border-acento hover:bg-acento/5'"
              @click="entrarComoDelegacion(d)"
            >
              {{ d.nombre }}
              <span
                v-if="cargandoDetalle === d.id"
                class="size-3.5 shrink-0 animate-spin rounded-full border-2 border-tinta-suave border-t-transparent"
                aria-hidden="true"
              />
            </button>
          </li>
        </ul>

        <p v-else class="rounded-lg border border-borde bg-lienzo-alto p-4 text-sm text-tinta-suave">
          No encontramos ninguna MCM Local con ese nombre. Si la tuya no está,
          <button
            type="button"
            class="text-acento underline underline-offset-2"
            @click="entrarComoPersona"
          >
            entra a título personal
          </button>
          y nos lo cuentas en el pedido.
        </p>
      </div>
    </main>

    <footer class="relative mx-auto w-full max-w-lg space-y-2 px-5 pb-8">
      <LogoInstitucional :ancho="140" />
      <p class="text-xs text-tinta-suave">Movimiento Consolación para el Mundo</p>
    </footer>
  </div>
</template>
