<script setup lang="ts">
import type { LineaCarrito } from '~/composables/useCarrito'

/**
 * Vuelta del navegador desde Redsys tras un pago correcto.
 *
 * Esta pantalla NO confirma nada por sí misma: quien confirma el cobro es la
 * notificación servidor a servidor. Aquí sólo se le dice a la persona que ha ido
 * bien y se le vacía el carrito. Por eso el texto no promete "pedido confirmado"
 * de forma tajante: si algo hubiera fallado por detrás, el equipo lo ve y avisa.
 */
const { lineas, totalCentimos, vaciar } = useCarrito()
const ruta = useRoute()

const referencia = computed(() => {
  const p = ruta.query.pedido
  return typeof p === 'string' && p ? p : null
})

const recibo = ref<{ lineas: LineaCarrito[]; totalCentimos: number } | null>(null)

/**
 * El carrito se lee antes de vaciarlo para poder imprimir el desglose. Si se
 * recarga la página ya no queda nada que leer, y el recibo sale sin líneas — que
 * es justo lo que ReciboPedido sabe hacer.
 */
onMounted(() => {
  if (lineas.value.length) {
    recibo.value = {
      lineas: lineas.value.map((l) => ({ ...l })),
      totalCentimos: totalCentimos.value,
    }
  }
  vaciar()
})

useSeoMeta({ title: 'Pago recibido' })
</script>

<template>
  <main class="mx-auto max-w-sm px-4 py-12">
    <TicketImpresora>
      <ReciboPedido
        :lineas="recibo?.lineas"
        :total-centimos="recibo?.totalCentimos ?? 0"
        :referencia="referencia"
        metodo-pago="tarjeta"
        sello="Pagado"
      />
    </TicketImpresora>

    <h1 class="mcm-animar-entrada mt-8 text-center text-2xl font-semibold">¡Pago recibido!</h1>
    <p class="mcm-animar-entrada mt-2 text-center text-sm text-tinta-suave">
      Gracias. Si has elegido mensajería, te confirmamos el coste del envío antes de mandar nada.
    </p>

    <div class="mcm-animar-entrada mt-6 flex flex-wrap justify-center gap-2">
      <NuxtLink
        to="/mis-pedidos"
        class="rounded-lg bg-acento px-4 py-2.5 text-sm font-medium text-sobre-acento transition hover:bg-acento-alto"
      >
        Ver mis pedidos
      </NuxtLink>
      <NuxtLink
        to="/"
        class="rounded-lg border border-borde px-4 py-2.5 text-sm font-medium transition hover:border-tinta-suave"
      >
        Volver al catálogo
      </NuxtLink>
    </div>
  </main>
</template>
