<script setup lang="ts">
/**
 * Puerta de entrada al modo evento: el enlace (o el QR) que se abre en el puesto.
 *
 * Si el evento está hoy en fechas, deja este dispositivo en modo evento y manda
 * al catálogo. Si no, lo dice claro en vez de abrir la tienda normal sin más,
 * que haría pensar que el modo evento está puesto cuando no lo está.
 */
const ruta = useRoute()
const { activar } = useEvento()
const { elegirPersonal } = useModo()

const id = String(ruta.params.id ?? '')
const evento = eventoActivo(id)
const existe = EVENTOS.some((e) => e.id === id)

if (evento) {
  activar(evento.id)
  // En un puesto se compra para uno mismo, aunque ese móvil se usara antes
  // para pedir como MCM Local: quien escanea el QR del puesto viene a eso.
  elegirPersonal()
  await navigateTo('/', { replace: true })
}

useSeoMeta({ title: 'Evento' })
</script>

<template>
  <main class="mx-auto max-w-md px-4 py-16 text-center">
    <h1 class="text-xl font-semibold">
      {{ existe ? 'Este evento no está abierto hoy' : 'No encontramos ese evento' }}
    </h1>
    <p class="mt-2 text-sm text-muted-foreground">
      <template v-if="existe">
        La venta en el puesto sólo funciona en las fechas del evento. Puedes pedir online igual.
      </template>
      <template v-else>Revisa el enlace o el QR. Puedes pedir online igual.</template>
    </p>
    <NuxtLink
      to="/"
      class="mt-6 inline-block rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
    >
      Ir a la tienda
    </NuxtLink>
  </main>
</template>
