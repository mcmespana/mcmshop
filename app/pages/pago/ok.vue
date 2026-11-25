<script setup lang="ts">
/**
 * Vuelta del navegador desde Redsys tras un pago correcto.
 *
 * Esta pantalla NO confirma nada por sí misma: quien confirma el cobro es la
 * notificación servidor a servidor. Aquí sólo se le dice a la persona que ha ido
 * bien y se le vacía el carrito. Por eso el texto no promete "pedido confirmado"
 * de forma tajante: si algo hubiera fallado por detrás, el equipo lo ve y avisa.
 */
const { vaciar, hayReserva } = useCarrito()
/** Se mira antes de vaciar el carrito, que es de donde sale. */
const conReserva = ref(false)
const { evento } = useEvento()
const { tiques, cargar } = useTiques()
const ruta = useRoute()

onMounted(() => {
  conReserva.value = hayReserva.value
  vaciar()
  // En el puesto, lo que hay que enseñar es el tique, no esta pantalla: se
  // guardó antes de ir al banco y allí se espera a que el cobro se confirme.
  if (!evento.value) return
  cargar()
  const tique = tiques.value.find((t) => t.pagoRedsys === String(ruta.query.pedido ?? ''))
  if (tique) navigateTo({ path: '/tique', query: { t: tique.clave, nuevo: '1' } }, { replace: true })
})

useSeoMeta({ title: 'Pago recibido' })
</script>

<template>
  <main class="mx-auto max-w-lg px-4 py-16 text-center">
    <TicketImpresora>
      <IconoExito class="mx-auto" />
      <h1 class="mt-2 text-2xl font-semibold">¡Pago recibido!</h1>
      <p v-if="evento" class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Gracias. Enseña esta pantalla en el puesto y te damos tu pedido.
      </p>
      <p v-else class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Gracias. Te llega un correo con el detalle del pedido. Si has elegido mensajería, te
        confirmamos el coste del envío antes de mandar nada.
      </p>

      <p v-if="conReserva" class="mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 text-sm">
        <span
          class="shrink-0 rounded-sm bg-foreground px-1.5 py-px text-[10px] font-semibold tracking-wide text-card uppercase"
        >
          Reserva
        </span>
        Te avisamos cuando llegue, en {{ PLAZO_RESERVA }}.
      </p>

      <div class="mx-auto mt-6 max-w-sm text-left">
        <InstruccionesPago metodo="tarjeta" />
      </div>

      <div v-if="evento" class="mt-6">
        <NuxtLink
          to="/"
          class="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
        >
          Hacer otro pedido
        </NuxtLink>
      </div>

      <div v-if="!evento" class="mx-auto mt-4 max-w-sm text-left">
        <ContactoAyuda variante="destacada" />
      </div>

      <div v-if="!evento" class="mt-6 flex flex-wrap justify-center gap-2">
        <NuxtLink
          to="/mis-pedidos"
          class="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
        >
          Ver mis pedidos
        </NuxtLink>
        <NuxtLink
          to="/"
          class="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition hover:border-muted-foreground"
        >
          Volver al catálogo
        </NuxtLink>
      </div>
    </TicketImpresora>
  </main>
</template>
