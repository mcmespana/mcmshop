<script setup lang="ts">
const { lineas, totalCentimos, unidades, vacio, vaciar } = useCarrito()
const { modo, delegacion, proponer } = useModo()

const { data: sesion } = await useFetch('/api/sesion')

const formulario = reactive({
  email: '',
  nombre: '',
  telefono: '',
  cif: '',
  direccion: '',
  poblacion: '',
  provincia: '',
  codigoPostal: '',
  personaContacto: '',
  notas: '',
  transporte: 'consolacion' as 'consolacion' | 'mensajeria',
  // Marcada de salida por decisión del equipo. Ver la nota bajo la casilla.
  proteccionDatos: true,
})

// El nombre de la delegación elegida en la bienvenida ya viene puesto: quien pide
// para MCM Castellón no debería tener que volver a escribirlo.
watchEffect(() => {
  if (modo.value === 'b2b' && delegacion.value) formulario.nombre ||= delegacion.value.nombre
})

// Si hay sesión de Google, los datos vienen precargados.
watchEffect(() => {
  if (!sesion.value?.autenticado) return
  formulario.email ||= sesion.value.email
  formulario.nombre ||= sesion.value.nombre ?? ''
  // Su contacto es delegación: se propone B2B, pero si ya eligió, manda su elección.
  // Alguien de una delegación también hace pedidos personales.
  if (sesion.value.esDelegacion) proponer('b2b')
})

const enviando = ref(false)
const error = ref<string | null>(null)
const pedidoHecho = ref(false)

/**
 * Cómo se paga. Tarjeta sólo en B2B: es delegación pidiendo con su tarjeta de
 * cuenta o similar, mientras que en B2C se mantiene Bizum, que es lo que ya usan
 * los particulares y no tiene coste de pasarela.
 */
const formaDePago = ref<'transferencia' | 'tarjeta'>('transferencia')
watch(modo, () => (formaDePago.value = 'transferencia'))

// Se genera una vez por carrito: si la petición se corta y se reintenta, Holded
// no acaba con dos pedidos iguales.
const claveIdempotencia = ref(crypto.randomUUID())

function datosComunes() {
  return {
    modo: modo.value,
    transporte: formulario.transporte,
    lineas: lineas.value.map((l) => ({
      productoId: l.productoId,
      varianteId: l.varianteId,
      cantidad: l.cantidad,
    })),
    cliente: {
      email: formulario.email,
      nombre: formulario.nombre,
      telefono: formulario.telefono || undefined,
      cif: formulario.cif || undefined,
      direccion: formulario.direccion || undefined,
      poblacion: formulario.poblacion || undefined,
      provincia: formulario.provincia || undefined,
      codigoPostal: formulario.codigoPostal || undefined,
    },
    personaContacto: formulario.personaContacto || undefined,
    notas: formulario.notas || undefined,
  }
}

async function enviar() {
  if (enviando.value) return
  enviando.value = true
  error.value = null

  try {
    if (formaDePago.value === 'tarjeta') {
      // Redsys se paga con un formulario que se autoenvía por POST: el pedido no
      // se crea todavía en Holded, sólo cuando el banco confirme el cobro.
      const redsys = await $fetch('/api/pago/iniciar', {
        method: 'POST',
        body: { claveIdempotencia: claveIdempotencia.value, ...datosComunes() },
      })

      const form = document.createElement('form')
      form.method = 'POST'
      form.action = redsys.url
      form.style.display = 'none'
      for (const [nombre, valor] of Object.entries({
        Ds_SignatureVersion: redsys.Ds_SignatureVersion,
        Ds_MerchantParameters: redsys.Ds_MerchantParameters,
        Ds_Signature: redsys.Ds_Signature,
      })) {
        const campo = document.createElement('input')
        campo.type = 'hidden'
        campo.name = nombre
        campo.value = valor
        form.appendChild(campo)
      }
      document.body.appendChild(form)
      form.submit()
      // No se desactiva `enviando`: la página va a navegar fuera ahora mismo.
      return
    }

    await $fetch('/api/pedidos', {
      method: 'POST',
      body: { claveIdempotencia: claveIdempotencia.value, ...datosComunes() },
    })
    pedidoHecho.value = true
    vaciar()
  } catch (e) {
    const mensaje = (e as { statusMessage?: string })?.statusMessage
    error.value = mensaje ?? 'No hemos podido registrar el pedido. Inténtalo en un momento.'
    enviando.value = false
  }
}

useSeoMeta({ title: 'Finalizar pedido' })
</script>

<template>
  <main class="mx-auto max-w-3xl px-4 py-8">
    <!-- Confirmación -->
    <div v-if="pedidoHecho" class="rounded-tarjeta border border-borde bg-lienzo-alto p-8">
      <h1 class="text-xl font-semibold">Pedido recibido</h1>
      <p class="mt-2 text-sm text-tinta-suave">
        Te hemos apuntado el pedido. Te escribimos al correo con los datos para pagar y, si has
        elegido mensajería, con el coste del envío antes de mandar nada.
      </p>
      <NuxtLink
        to="/"
        class="mt-6 inline-block rounded-lg bg-acento px-4 py-2.5 text-sm font-medium text-sobre-acento transition hover:bg-acento-alto"
      >
        Volver al catálogo
      </NuxtLink>
    </div>

    <div v-else-if="vacio" class="rounded-tarjeta border border-borde bg-lienzo-alto p-8 text-center">
      <p class="font-medium">Tu carrito está vacío</p>
      <NuxtLink to="/" class="mt-3 inline-block text-sm text-acento underline underline-offset-2">
        Ir al catálogo
      </NuxtLink>
    </div>

    <form v-else class="space-y-6" @submit.prevent="enviar">
      <div>
        <h1 class="text-xl font-semibold">Finalizar pedido</h1>
        <p class="mt-1 text-sm text-tinta-suave">
          {{ unidades }} {{ unidades === 1 ? 'unidad' : 'unidades' }} ·
          {{ formatearEuros(totalCentimos) }}
        </p>
      </div>

      <!-- Login opcional: se invita, no se obliga -->
      <div
        v-if="!sesion?.autenticado"
        class="flex flex-wrap items-center gap-3 rounded-tarjeta border border-borde bg-lienzo-alto px-4 py-3"
      >
        <p class="flex-1 text-sm text-tinta-suave">
          Si entras con Google te rellenamos los datos y podrás ver tus pedidos anteriores.
        </p>
        <a
          href="/auth/google?destino=/checkout"
          class="rounded-lg border border-borde px-3 py-1.5 text-sm font-medium transition hover:border-tinta-suave"
        >
          Entrar con Google
        </a>
      </div>

      <section class="space-y-3 rounded-tarjeta border border-borde bg-lienzo-alto p-4">
        <h2 class="font-medium">Tus datos</h2>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1 block text-xs text-tinta-suave">Correo electrónico</span>
            <input
              v-model="formulario.email"
              type="email"
              required
              class="w-full rounded-lg border border-borde bg-lienzo px-3 py-2 text-sm outline-none focus:border-acento"
            />
          </label>

          <label class="block">
            <span class="mb-1 block text-xs text-tinta-suave">
              {{ modo === 'b2b' ? 'Nombre de la delegación' : 'Nombre y apellidos' }}
            </span>
            <input
              v-model="formulario.nombre"
              type="text"
              required
              minlength="2"
              class="w-full rounded-lg border border-borde bg-lienzo px-3 py-2 text-sm outline-none focus:border-acento"
            />
          </label>

          <label v-if="modo === 'b2b'" class="block">
            <span class="mb-1 block text-xs text-tinta-suave">
              ¿Con quién hablamos de este pedido?
            </span>
            <input
              v-model="formulario.personaContacto"
              type="text"
              required
              placeholder="Nombre de la persona"
              class="w-full rounded-lg border border-borde bg-lienzo px-3 py-2 text-sm outline-none focus:border-acento"
            />
          </label>

          <label class="block">
            <span class="mb-1 block text-xs text-tinta-suave">Teléfono</span>
            <input
              v-model="formulario.telefono"
              type="tel"
              class="w-full rounded-lg border border-borde bg-lienzo px-3 py-2 text-sm outline-none focus:border-acento"
            />
          </label>

          <label class="block sm:col-span-2">
            <span class="mb-1 block text-xs text-tinta-suave">Dirección de envío</span>
            <input
              v-model="formulario.direccion"
              type="text"
              class="w-full rounded-lg border border-borde bg-lienzo px-3 py-2 text-sm outline-none focus:border-acento"
            />
          </label>

          <label class="block">
            <span class="mb-1 block text-xs text-tinta-suave">Población</span>
            <input
              v-model="formulario.poblacion"
              type="text"
              class="w-full rounded-lg border border-borde bg-lienzo px-3 py-2 text-sm outline-none focus:border-acento"
            />
          </label>

          <label class="block">
            <span class="mb-1 block text-xs text-tinta-suave">Código postal</span>
            <input
              v-model="formulario.codigoPostal"
              type="text"
              inputmode="numeric"
              class="w-full rounded-lg border border-borde bg-lienzo px-3 py-2 text-sm outline-none focus:border-acento"
            />
          </label>
        </div>
      </section>

      <section class="space-y-3 rounded-tarjeta border border-borde bg-lienzo-alto p-4">
        <h2 class="font-medium">Cómo te lo hacemos llegar</h2>

        <label
          class="flex cursor-pointer gap-3 rounded-lg border p-3 transition"
          :class="
            formulario.transporte === 'consolacion' ? 'border-acento bg-acento/5' : 'border-borde'
          "
        >
          <input v-model="formulario.transporte" type="radio" value="consolacion" class="mt-1" />
          <span>
            <span class="block text-sm font-medium">Transporte Consolación · gratis</span>
            <span class="block text-xs text-tinta-suave">
              Te llegará cuando alguien de la Familia Consolación vaya para allá.
            </span>
          </span>
        </label>

        <!--
          Nunca se muestra un precio de mensajería: no se sabe de antemano y no se
          inventa. Explicar por qué es lo que hace que se sienta honesto.
        -->
        <label
          class="flex cursor-pointer gap-3 rounded-lg border p-3 transition"
          :class="
            formulario.transporte === 'mensajeria' ? 'border-acento bg-acento/5' : 'border-borde'
          "
        >
          <input v-model="formulario.transporte" type="radio" value="mensajeria" class="mt-1" />
          <span>
            <span class="block text-sm font-medium">Mensajería urgente</span>
            <span class="block text-xs text-tinta-suave">
              Te lo enviamos por agencia. El coste depende del destino y del peso; te lo
              confirmamos por correo antes de enviar nada.
            </span>
          </span>
        </label>
      </section>

      <section class="space-y-3 rounded-tarjeta border border-borde bg-lienzo-alto p-4">
        <h2 class="font-medium">Pago</h2>

        <!-- B2C: sólo Bizum, sin selector — es lo único que hay, no hace falta elegir -->
        <div v-if="modo === 'b2c'" class="flex items-center gap-3 rounded-lg border border-borde p-3">
          <IconoBizum class="size-9 shrink-0" />
          <span class="text-sm text-tinta-suave">
            Con <strong class="font-medium text-tinta">Bizum ONG</strong>. Apuntamos el pedido y te
            mandamos el código y las instrucciones por correo.
          </span>
        </div>

        <!-- B2B: transferencia o tarjeta -->
        <div v-else class="space-y-2.5">
          <label
            class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition"
            :class="formaDePago === 'transferencia' ? 'border-acento bg-acento/5' : 'border-borde'"
          >
            <input v-model="formaDePago" type="radio" value="transferencia" />
            <IconoTransferencia class="size-9 shrink-0" />
            <span>
              <span class="block text-sm font-medium">Transferencia bancaria</span>
              <span class="block text-xs text-tinta-suave">
                Apuntamos el pedido y te mandamos el IBAN y la referencia por correo.
              </span>
            </span>
          </label>

          <label
            class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition"
            :class="formaDePago === 'tarjeta' ? 'border-acento bg-acento/5' : 'border-borde'"
          >
            <input v-model="formaDePago" type="radio" value="tarjeta" />
            <IconoTarjeta class="size-9 shrink-0" />
            <span>
              <span class="block text-sm font-medium">Tarjeta, ahora mismo</span>
              <span class="block text-xs text-tinta-suave">
                Pago seguro con Redsys. El pedido se confirma en cuanto el banco lo autoriza.
              </span>
            </span>
          </label>
        </div>

        <label class="block pt-1">
          <span class="mb-1 block text-xs text-tinta-suave">¿Nos quieres decir algo más?</span>
          <textarea
            v-model="formulario.notas"
            rows="2"
            class="w-full rounded-lg border border-borde bg-lienzo px-3 py-2 text-sm outline-none focus:border-acento"
          />
        </label>
      </section>

      <label class="flex cursor-pointer items-start gap-2.5 px-1 text-sm">
        <input v-model="formulario.proteccionDatos" type="checkbox" class="mt-0.5 shrink-0" />
        <span class="text-tinta-suave">
          He leído la
          <a
            href="https://comunica.movimientoconsolacion.com/politicadeprivacidad/"
            target="_blank"
            rel="noopener"
            class="text-acento underline underline-offset-2"
          >
            política de privacidad </a
          >. Usamos tus datos para preparar y enviarte este pedido.
        </span>
      </label>

      <p v-if="error" class="rounded-lg bg-aviso/10 px-3.5 py-2.5 text-sm text-aviso">
        {{ error }}
      </p>

      <button
        type="submit"
        :disabled="enviando || !formulario.proteccionDatos"
        class="w-full rounded-lg bg-acento py-3 text-sm font-medium text-sobre-acento transition hover:bg-acento-alto disabled:opacity-60"
      >
        <template v-if="enviando">
          {{ formaDePago === 'tarjeta' ? 'Te llevamos al banco…' : 'Enviando…' }}
        </template>
        <template v-else-if="formaDePago === 'tarjeta'">
          Pagar {{ formatearEuros(totalCentimos) }} con tarjeta
        </template>
        <template v-else> Confirmar pedido · {{ formatearEuros(totalCentimos) }} </template>
      </button>
    </form>
  </main>
</template>
