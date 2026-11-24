<script setup lang="ts">
/**
 * El tique de una compra en el evento, para enseñarlo en el puesto.
 *
 * Sale del almacenamiento del móvil (useTiques), no de Holded: así funciona
 * aunque se haya recargado, cerrado la pestaña o caído la wifi del pabellón.
 *
 * Con tarjeta el tique llega aquí antes que la confirmación del banco, sin
 * número. Se pregunta al servidor cada dos segundos hasta que la notificación
 * de Redsys haya creado el pedido, y entonces aparece el número.
 */
const ruta = useRoute()
const { tiques, cargar, buscar, actualizar } = useTiques()

const listo = ref(false)
onMounted(() => {
  cargar()
  listo.value = true
})

const clave = computed(() => (ruta.query.t ? String(ruta.query.t) : null))
const tique = computed(() => (listo.value ? (buscar(clave.value) ?? tiques.value[0] ?? null) : null))
/** Se imprime sólo al llegar de hacer el pedido; al volver a mirarlo, ya está impreso. */
const imprimiendo = computed(() => ruta.query.nuevo === '1')

const otros = computed(() => tiques.value.filter((t) => t.clave !== tique.value?.clave).slice(0, 6))

// Espera a que el banco confirme un pago con tarjeta.
let sondeo: ReturnType<typeof setTimeout> | undefined
let intentos = 0

async function preguntarAlBanco() {
  const t = tique.value
  if (!t || t.estado !== 'esperando-banco' || !t.pagoRedsys) return
  try {
    const r = await $fetch<{ estado: string; numero?: string | null }>('/api/pago/estado', {
      query: { pedido: t.pagoRedsys },
    })
    if (r.estado === 'pagado') {
      actualizar(t.clave, { estado: 'confirmado', numero: r.numero ?? null })
      return
    }
    if (r.estado === 'rechazado') {
      actualizar(t.clave, { estado: 'rechazado' })
      return
    }
  } catch {
    // Wifi de pabellón: se vuelve a intentar.
  }
  // Dos minutos como mucho: el banco avisa en segundos, y si no lo ha hecho en
  // ese rato lo resuelve el equipo en el puesto mirando Holded.
  if (++intentos < 60) sondeo = setTimeout(preguntarAlBanco, 2000)
}

watch(
  () => tique.value?.clave,
  () => {
    clearTimeout(sondeo)
    intentos = 0
    preguntarAlBanco()
  },
)
onBeforeUnmount(() => clearTimeout(sondeo))

function elegir(c: string) {
  navigateTo({ path: '/tique', query: { t: c } }, { replace: true })
}

useSeoMeta({ title: 'Tu pedido' })
</script>

<template>
  <main class="mx-auto max-w-md px-4 pt-6 pb-10">
    <template v-if="tique">
      <p class="mcm-animar-entrada mb-4 text-center text-sm text-muted-foreground">
        Enseña esta pantalla en el puesto y te lo damos.
      </p>

      <TiqueEvento :key="tique.clave" :tique="tique" :imprimiendo="imprimiendo" />

      <div class="mt-6 grid gap-2">
        <NuxtLink
          to="/"
          class="rounded-lg bg-primary py-3 text-center text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
        >
          Hacer otro pedido
        </NuxtLink>
      </div>

      <section v-if="otros.length" class="mt-8">
        <h2 class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Tus otros pedidos
        </h2>
        <ul class="grid gap-2">
          <li v-for="t in otros" :key="t.clave">
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm transition hover:border-muted-foreground"
              @click="elegir(t.clave)"
            >
              <span class="w-12 shrink-0 font-mono font-semibold tabular-nums">
                {{ t.numero ?? '—' }}
              </span>
              <span class="min-w-0 flex-1 truncate">{{ t.eventoNombre }}</span>
              <span class="shrink-0 tabular-nums">{{ formatearImporte(t.totalCentimos) }}</span>
            </button>
          </li>
        </ul>
      </section>
    </template>

    <div v-else-if="listo" class="rounded-xl border border-border bg-card p-8 text-center">
      <p class="font-medium">No hay ningún pedido en este móvil</p>
      <p class="mt-1 text-sm text-muted-foreground">
        Los tiques se guardan en el móvil desde el que se pidió. Si lo hiciste desde otro, míralo
        allí o pregunta en el puesto por tu nombre.
      </p>
      <NuxtLink to="/" class="mt-4 inline-block text-sm text-primary underline underline-offset-2">
        Ir al catálogo
      </NuxtLink>
    </div>
  </main>
</template>
