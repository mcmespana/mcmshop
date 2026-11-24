<script setup lang="ts">
import type { EntregaTpv, PagoTpv } from '~/composables/useVentaTpv'

/**
 * El ticket de la venta en curso: líneas, a nombre de quién, cómo paga y si
 * se lo lleva. Y el botón grande.
 *
 * El orden es el de la conversación en el puesto: "¿qué te llevas? — ¿a nombre
 * de quién? — ¿cómo pagas?". Todo lo demás (correo, teléfono, MCM Local,
 * notas) está plegado: hace falta para un pedido por teléfono, estorba en la
 * cola del congreso.
 */
const emit = defineEmits<{ registrada: [] }>()

const v = useVentaTpv()
const masDatos = ref(false)

const { data: delegaciones } = useLazyFetch<{ delegaciones: Array<{ id: string; nombre: string }> }>(
  '/api/delegaciones',
  { immediate: false, server: false, key: 'tpv-delegaciones' },
)
watch(masDatos, (abierto) => {
  if (abierto && !delegaciones.value) refreshNuxtData('tpv-delegaciones')
})

const PAGOS: Array<{ id: PagoTpv; texto: string; pista: string }> = [
  { id: 'efectivo', texto: 'Efectivo', pista: 'Cobrado' },
  { id: 'bizum', texto: 'Bizum', pista: 'Cobrado' },
  { id: 'tarjeta', texto: 'Tarjeta', pista: 'Datáfono' },
  { id: 'pendiente', texto: 'Paga luego', pista: 'Sin cobrar' },
]

const ENTREGAS: Array<{ id: EntregaTpv; texto: string }> = [
  { id: 'entregado', texto: 'Se lo lleva' },
  { id: 'reservado', texto: 'Reservado' },
]

async function registrar() {
  if (await v.registrar()) emit('registrada')
}
</script>

<template>
  <form class="flex h-full flex-col" @submit.prevent="registrar">
    <div class="min-h-0 flex-1 space-y-5 overflow-y-auto">
      <!-- Líneas -->
      <section aria-label="Productos de la venta">
        <p v-if="!v.lineas.value.length" class="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Toca un producto para empezar la venta.
        </p>
        <ul v-else class="divide-y divide-border">
          <li v-for="l in v.lineas.value" :key="l.clave" class="flex items-center gap-3 py-2.5">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ l.nombre }}</p>
              <p class="truncate text-xs text-muted-foreground">
                <span v-if="l.variante">{{ l.variante }} · </span>
                <span class="tabular-nums">{{ formatearEuros(l.precioCentimos) }}</span>
                <span v-if="l.cantidad > l.stock" class="font-medium text-warn"> · sin stock suficiente</span>
              </p>
            </div>
            <div class="flex shrink-0 items-center rounded-lg border border-border">
              <button
                type="button"
                class="toque flex size-9 items-center justify-center text-lg text-muted-foreground transition hover:text-foreground"
                :aria-label="`Quitar uno de ${l.nombre}${l.variante ? ` ${l.variante}` : ''}`"
                @click="v.cambiarCantidad(l.clave, -1)"
              >
                −
              </button>
              <span class="w-7 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                {{ l.cantidad }}
              </span>
              <button
                type="button"
                class="toque flex size-9 items-center justify-center text-lg text-muted-foreground transition hover:text-foreground"
                :aria-label="`Añadir otro de ${l.nombre}${l.variante ? ` ${l.variante}` : ''}`"
                @click="v.cambiarCantidad(l.clave, 1)"
              >
                +
              </button>
            </div>
            <span class="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">
              {{ formatearImporte(l.precioCentimos * l.cantidad) }}
            </span>
          </li>
        </ul>
      </section>

      <!-- A nombre de quién -->
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-muted-foreground">Nombre y localidad</span>
        <input
          v-model="v.nombre.value"
          type="text"
          autocomplete="off"
          enterkeyhint="done"
          placeholder="Marta, Vila-real (opcional)"
          class="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-primary"
        />
      </label>

      <!-- Cómo paga -->
      <fieldset>
        <legend class="mb-1.5 text-xs font-medium text-muted-foreground">Pago</legend>
        <div class="grid grid-cols-4 gap-1.5">
          <label
            v-for="p in PAGOS"
            :key="p.id"
            class="flex cursor-pointer flex-col items-center justify-center rounded-lg border px-1 py-2 text-center transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
            :class="
              v.pago.value === p.id
                ? p.id === 'pendiente'
                  ? 'border-warn bg-warn/10'
                  : 'border-primary bg-primary/10'
                : 'border-border hover:border-muted-foreground'
            "
          >
            <input v-model="v.pago.value" type="radio" name="tpv-pago" :value="p.id" class="sr-only" />
            <span class="text-sm font-semibold">{{ p.texto }}</span>
            <span class="text-[0.75rem] text-muted-foreground">{{ p.pista }}</span>
          </label>
        </div>
      </fieldset>

      <!-- Si se lo lleva -->
      <fieldset>
        <legend class="mb-1.5 text-xs font-medium text-muted-foreground">Entrega</legend>
        <div class="grid grid-cols-2 gap-1.5">
          <label
            v-for="e in ENTREGAS"
            :key="e.id"
            class="flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2.5 text-sm font-semibold transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
            :class="
              v.entrega.value === e.id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-muted-foreground'
            "
          >
            <input v-model="v.entrega.value" type="radio" name="tpv-entrega" :value="e.id" class="sr-only" />
            {{ e.texto }}
          </label>
        </div>
        <p v-if="v.faltaStock.value" class="mt-1.5 text-xs text-warn">
          Hay algo sin stock suficiente: se apunta como reservado.
        </p>
      </fieldset>

      <!-- Para pedidos por teléfono y casos raros -->
      <div>
        <button
          type="button"
          class="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
          :aria-expanded="masDatos"
          @click="masDatos = !masDatos"
        >
          <svg viewBox="0 0 24 24" class="size-4 transition-transform" :class="{ 'rotate-90': masDatos }" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
          Más datos (teléfono, correo, MCM Local, nota)
        </button>
        <div v-if="masDatos" class="mcm-animar-entrada mt-3 grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1 block text-xs text-muted-foreground">Teléfono</span>
            <input v-model="v.telefono.value" type="tel" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-primary" />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs text-muted-foreground">Correo</span>
            <input v-model="v.email.value" type="email" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-primary" />
          </label>
          <label class="block sm:col-span-2">
            <span class="mb-1 block text-xs text-muted-foreground">Es para una MCM Local</span>
            <select v-model="v.delegacionId.value" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-primary">
              <option value="">No, es para una persona</option>
              <option v-for="d in delegaciones?.delegaciones ?? []" :key="d.id" :value="d.id">
                {{ d.nombre }}
              </option>
            </select>
          </label>
          <label class="block sm:col-span-2">
            <span class="mb-1 block text-xs text-muted-foreground">Nota para el pedido</span>
            <textarea v-model="v.notas.value" rows="2" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-primary" />
          </label>
        </div>
      </div>
    </div>

    <!-- El botón: siempre a la vista, al pie -->
    <div class="shrink-0 pt-4">
      <p v-if="v.error.value" class="mb-2 rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn" role="alert">
        {{ v.error.value }}
      </p>
      <button
        type="submit"
        :disabled="!v.lineas.value.length || v.registrando.value"
        :aria-busy="v.registrando.value"
        class="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary text-base font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        <span
          v-if="v.registrando.value"
          class="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
          aria-hidden="true"
        />
        <template v-if="v.registrando.value">Registrando…</template>
        <template v-else>
          Registrar venta · <span class="tabular-nums">{{ formatearImporte(v.totalCentimos.value) }}</span>
        </template>
      </button>
    </div>
  </form>
</template>
