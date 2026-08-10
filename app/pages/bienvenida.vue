<script setup lang="ts">
import type { Delegacion } from '~/composables/useModo'

const { elegirDelegacion, elegirPersonal, delegacion } = useModo()
const router = useRouter()

const { data } = await useFetch<{ delegaciones: Delegacion[] }>('/api/delegaciones')

const paso = ref<'inicio' | 'delegaciones'>('inicio')
const busqueda = ref('')

const lista = computed(() => {
  const todas = data.value?.delegaciones ?? []
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return todas
  return todas.filter((d) => d.nombre.toLowerCase().includes(q))
})

function entrarComoDelegacion(elegida: Delegacion) {
  elegirDelegacion(elegida)
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
  <div class="flex min-h-screen flex-col bg-lienzo">
    <main class="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-12">
      <div class="mb-8">
        <h1 class="text-2xl font-semibold">Tienda MCM</h1>
        <p class="mt-1.5 text-tinta-suave">
          Camisetas, sudaderas y pañuelos del Movimiento Consolación para el Mundo.
        </p>
      </div>

      <!-- Paso 1: quién eres -->
      <div v-if="paso === 'inicio'" class="space-y-3">
        <p class="text-sm font-medium">¿Quién hace el pedido?</p>

        <button
          type="button"
          class="w-full rounded-tarjeta border border-borde bg-lienzo-alto p-4 text-left transition hover:border-acento hover:bg-acento/5"
          @click="paso = 'delegaciones'"
        >
          <span class="block font-medium">Una delegación local</span>
          <span class="mt-0.5 block text-sm text-tinta-suave">
            Pedidos para el grupo. Se paga por transferencia.
          </span>
        </button>

        <button
          type="button"
          class="w-full rounded-tarjeta border border-borde bg-lienzo-alto p-4 text-left transition hover:border-acento hover:bg-acento/5"
          @click="entrarComoPersona"
        >
          <span class="block font-medium">Yo, a título personal</span>
          <span class="mt-0.5 block text-sm text-tinta-suave">
            Monitor o miembro del MCM. Se paga con Bizum.
          </span>
        </button>

        <p class="pt-2 text-xs text-tinta-suave">
          Puedes cambiarlo cuando quieras desde la cabecera. No hace falta ninguna contraseña para
          mirar el catálogo.
        </p>
      </div>

      <!-- Paso 2: qué delegación -->
      <div v-else class="space-y-3">
        <div class="flex items-baseline justify-between gap-2">
          <p class="text-sm font-medium">¿De qué delegación?</p>
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
              class="w-full rounded-lg border p-3 text-left text-sm font-medium transition hover:border-acento hover:bg-acento/5"
              :class="delegacion?.id === d.id ? 'border-acento bg-acento/5' : 'border-borde'"
              @click="entrarComoDelegacion(d)"
            >
              {{ d.nombre }}
            </button>
          </li>
        </ul>

        <p v-else class="rounded-lg border border-borde bg-lienzo-alto p-4 text-sm text-tinta-suave">
          No encontramos ninguna delegación con ese nombre. Si la tuya no está,
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

    <footer class="mx-auto w-full max-w-lg px-5 pb-8 text-xs text-tinta-suave">
      Asociación Juvenil Movimiento Consolación para el Mundo
    </footer>
  </div>
</template>
