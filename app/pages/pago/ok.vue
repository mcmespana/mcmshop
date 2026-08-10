<script setup lang="ts">
/**
 * Vuelta del navegador desde Redsys tras un pago correcto.
 *
 * Esta pantalla NO confirma nada por sí misma: quien confirma el cobro es la
 * notificación servidor a servidor. Aquí sólo se le dice a la persona que ha ido
 * bien y se le vacía el carrito. Por eso el texto no promete "pedido confirmado"
 * de forma tajante: si algo hubiera fallado por detrás, el equipo lo ve y avisa.
 */
const { vaciar } = useCarrito()

onMounted(() => vaciar())

useSeoMeta({ title: 'Pago recibido' })
</script>

<template>
  <main class="mx-auto max-w-lg px-4 py-16 text-center">
    <div class="mcm-animar-entrada rounded-tarjeta border border-borde bg-lienzo-alto p-8">
      <IconoExito class="mx-auto" />
      <h1 class="mt-2 text-2xl font-semibold">¡Pago recibido!</h1>
      <p class="mx-auto mt-2 max-w-sm text-sm text-tinta-suave">
        Gracias. Te llega un correo con el detalle del pedido. Si has elegido mensajería, te
        confirmamos el coste del envío antes de mandar nada.
      </p>

      <div class="mx-auto mt-6 max-w-sm text-left">
        <ContactoAyuda variante="destacada" />
      </div>

      <div class="mt-6 flex flex-wrap justify-center gap-2">
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
    </div>
  </main>
</template>
