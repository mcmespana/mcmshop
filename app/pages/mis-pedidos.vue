<script setup lang="ts">
const { data: sesion } = await useFetch('/api/sesion')

const { data, status, error } = await useFetch('/api/mis-pedidos', {
  // Sin sesión el endpoint devuelve 401: mejor no llamarlo y enseñar el aviso.
  immediate: true,
})

const abierto = ref<string | null>(null)

function alternar(id: string) {
  abierto.value = abierto.value === id ? null : id
}

const TONOS = {
  espera: 'bg-lienzo text-tinta-suave ring-borde',
  curso: 'bg-acento/10 text-acento-alto ring-acento/30',
  hecho: 'bg-acento/15 text-acento-alto ring-acento/40',
  malo: 'bg-aviso/10 text-aviso ring-aviso/30',
} as const

function fechaLarga(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

useSeoMeta({ title: 'Mis pedidos' })
</script>

<template>
  <main class="mx-auto max-w-3xl px-4 py-8">
    <h1 class="text-xl font-semibold">Mis pedidos</h1>

    <!-- Sin sesión -->
    <div
      v-if="!sesion?.autenticado"
      class="mt-6 rounded-tarjeta border border-borde bg-lienzo-alto p-8 text-center"
    >
      <p class="font-medium">Entra para ver tu histórico</p>
      <p class="mx-auto mt-1 max-w-sm text-sm text-tinta-suave">
        Buscamos tus pedidos por el correo con el que entres. No hace falta ninguna contraseña
        nueva.
      </p>
      <a
        href="/auth/google?destino=/mis-pedidos"
        class="mt-5 inline-block rounded-lg bg-acento px-4 py-2.5 text-sm font-medium text-sobre-acento transition hover:bg-acento-alto"
      >
        Entrar con Google
      </a>
    </div>

    <div v-else-if="status === 'pending'" class="mt-6 space-y-3">
      <div
        v-for="n in 3"
        :key="n"
        class="h-24 animate-pulse rounded-tarjeta border border-borde bg-lienzo-alto"
      />
    </div>

    <div
      v-else-if="error"
      class="mt-6 rounded-tarjeta border border-borde bg-lienzo-alto p-8 text-center text-sm text-tinta-suave"
    >
      No hemos podido consultar tus pedidos ahora mismo. Prueba en un momento.
    </div>

    <!-- Sin histórico -->
    <div
      v-else-if="!data?.pedidos.length"
      class="mt-6 rounded-tarjeta border border-borde bg-lienzo-alto p-8 text-center"
    >
      <p class="font-medium">Todavía no hay pedidos con este correo</p>
      <p class="mt-1 text-sm text-tinta-suave">
        {{
          data?.sinContacto
            ? 'Cuando hagas el primero, aparecerá aquí.'
            : 'Si pediste algo con otra dirección, entra con esa cuenta.'
        }}
      </p>
      <NuxtLink
        to="/"
        class="mt-5 inline-block rounded-lg border border-borde px-4 py-2.5 text-sm font-medium transition hover:border-tinta-suave"
      >
        Ir al catálogo
      </NuxtLink>
    </div>

    <ul v-else class="mt-6 space-y-3">
      <li
        v-for="pedido in data.pedidos"
        :key="pedido.id"
        class="overflow-hidden rounded-tarjeta border border-borde bg-lienzo-alto"
      >
        <button
          type="button"
          class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-lienzo"
          :aria-expanded="abierto === pedido.id"
          @click="alternar(pedido.id)"
        >
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span class="font-medium">
                {{ pedido.numero ?? 'Pedido sin numerar' }}
              </span>
              <span
                class="rounded-full px-2 py-0.5 text-xs ring-1 ring-inset"
                :class="TONOS[pedido.tono]"
              >
                {{ pedido.estado }}
              </span>
            </div>
            <p class="mt-0.5 text-xs text-tinta-suave">
              {{ fechaLarga(pedido.fecha) }}
              <template v-if="pedido.lineas.length">
                · {{ pedido.lineas.length }}
                {{ pedido.lineas.length === 1 ? 'artículo' : 'artículos' }}
              </template>
            </p>
          </div>

          <span class="shrink-0 font-semibold tabular-nums">
            {{ formatearEuros(pedido.totalCentimos) }}
          </span>
          <span
            class="shrink-0 text-tinta-suave transition"
            :class="abierto === pedido.id ? 'rotate-180' : ''"
            aria-hidden="true"
          >
            ⌄
          </span>
        </button>

        <div v-if="abierto === pedido.id" class="border-t border-borde px-4 py-3">
          <ul class="divide-y divide-borde">
            <li
              v-for="(linea, i) in pedido.lineas"
              :key="i"
              class="flex items-baseline gap-3 py-2 text-sm"
            >
              <span class="w-8 shrink-0 text-tinta-suave tabular-nums">{{ linea.unidades }}×</span>
              <span class="min-w-0 flex-1">
                {{ linea.nombre }}
                <span v-if="linea.variante" class="block text-xs text-tinta-suave">
                  {{ linea.variante }}
                </span>
              </span>
              <span class="shrink-0 tabular-nums">
                {{ formatearEuros(linea.precioCentimos * linea.unidades) }}
              </span>
            </li>
          </ul>

          <div v-if="pedido.seguimiento" class="mt-3 rounded-lg bg-lienzo px-3 py-2 text-sm">
            <span class="text-tinta-suave">Envío:</span>
            {{ pedido.seguimiento.transportista ?? 'agencia' }}
            <span v-if="pedido.seguimiento.numero" class="font-medium">
              · {{ pedido.seguimiento.numero }}
            </span>
          </div>

          <p v-if="pedido.fechaEntrega" class="mt-2 text-xs text-tinta-suave">
            Entrega prevista: {{ fechaLarga(pedido.fechaEntrega) }}
          </p>

          <a
            v-if="!pedido.borrador"
            :href="`/api/pedidos/${pedido.id}/pdf`"
            target="_blank"
            rel="noopener"
            class="mt-3 inline-block text-sm text-acento underline underline-offset-2"
          >
            Ver el PDF del pedido
          </a>
        </div>
      </li>
    </ul>
  </main>
</template>
