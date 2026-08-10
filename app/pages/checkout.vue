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
  fechaLimite: '',
  // Marcada de salida por decisión del equipo. Ver la nota bajo la casilla.
  proteccionDatos: true,
})

const sinFechaConcreta = ref(false)
watch(sinFechaConcreta, (v) => {
  if (v) formulario.fechaLimite = ''
})

const hoy = new Date().toISOString().slice(0, 10)

/**
 * Dirección de la MCM Local elegida en la bienvenida, si la tenemos. Marcada
 * por defecto: quien pide para su MCM Local casi siempre quiere que llegue ahí.
 */
const hayDireccionMcmLocal = computed(
  () => modo.value === 'b2b' && !!delegacion.value?.direccion?.address,
)
const usarDireccionMcmLocal = ref(true)

function aplicarDireccionMcmLocal() {
  const dir = delegacion.value?.direccion
  if (!dir) return
  formulario.direccion = dir.address ?? ''
  formulario.poblacion = dir.city ?? ''
  formulario.provincia = dir.province ?? ''
  formulario.codigoPostal = dir.postal_code ?? ''
}

watch(usarDireccionMcmLocal, (v) => {
  if (v) {
    aplicarDireccionMcmLocal()
  } else {
    formulario.direccion = ''
    formulario.poblacion = ''
    formulario.provincia = ''
    formulario.codigoPostal = ''
  }
})

/**
 * Autorrelleno inicial, una sola vez con los datos ya disponibles (la sesión se
 * espera arriba, la MCM Local viene de una cookie): no es reactivo a propósito,
 * para no pisar lo que la persona edite a mano si algo cambia después.
 *
 * Prioridad del email: la cuenta de Google (identidad verificada) manda sobre
 * el correo genérico de la MCM Local.
 */
if (modo.value === 'b2b' && delegacion.value) {
  formulario.nombre = delegacion.value.nombre
  if (delegacion.value.email) formulario.email = delegacion.value.email
  if (hayDireccionMcmLocal.value) aplicarDireccionMcmLocal()
}
if (sesion.value?.autenticado) {
  formulario.email = sesion.value.email
  formulario.nombre ||= sesion.value.nombre ?? ''
}
// Su contacto es MCM Local: se propone B2B, pero si ya eligió, manda su elección.
if (sesion.value?.autenticado && sesion.value.esDelegacion) proponer('b2b')

const enviando = ref(false)
const error = ref<string | null>(null)
const pedidoHecho = ref(false)

/**
 * Cómo se paga:
 *  - B2C: bizum, transferencia o tarjeta, las tres a la vista.
 *  - B2B: transferencia por delante; bizum y tarjeta viven en "otros métodos".
 */
const formaDePago = ref<'transferencia' | 'bizum' | 'tarjeta'>(
  modo.value === 'b2b' ? 'transferencia' : 'bizum',
)
const otrosMetodosAbierto = ref(false)
watch(modo, (m) => {
  formaDePago.value = m === 'b2b' ? 'transferencia' : 'bizum'
  otrosMetodosAbierto.value = false
})

// Se genera una vez por carrito: si la petición se corta y se reintenta, Holded
// no acaba con dos pedidos iguales.
const claveIdempotencia = ref(crypto.randomUUID())

function datosComunes() {
  return {
    modo: modo.value,
    transporte: formulario.transporte,
    fechaLimite:
      formulario.transporte === 'consolacion' && !sinFechaConcreta.value
        ? formulario.fechaLimite || undefined
        : undefined,
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
      body: {
        claveIdempotencia: claveIdempotencia.value,
        formaDePago: formaDePago.value,
        ...datosComunes(),
      },
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
    <!-- Confirmación: pantalla de fiesta -->
    <div v-if="pedidoHecho" class="mcm-animar-entrada rounded-tarjeta border border-borde bg-lienzo-alto p-8 text-center">
      <IconoExito class="mx-auto" />
      <h1 class="mt-2 text-2xl font-semibold">¡Pedido recibido!</h1>
      <p class="mx-auto mt-2 max-w-md text-sm text-tinta-suave">
        Gracias{{ formulario.nombre ? `, ${formulario.nombre.split(' ')[0]}` : '' }}. Te hemos
        mandado un correo con todo el detalle
        <template v-if="formulario.transporte === 'mensajeria'">
          y te confirmamos el coste del envío antes de mandar nada.
        </template>
      </p>

      <div
        v-if="formaDePago === 'bizum' || formaDePago === 'transferencia'"
        class="mx-auto mt-6 max-w-sm text-left"
      >
        <InstruccionesPago :metodo="formaDePago" :concepto="formulario.nombre || formulario.email" />
      </div>

      <div class="mx-auto mt-4 max-w-sm text-left">
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
              {{ modo === 'b2b' ? 'Nombre de tu MCM Local' : 'Nombre y apellidos' }}
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

          <label v-if="hayDireccionMcmLocal" class="flex items-center gap-2 sm:col-span-2">
            <input v-model="usarDireccionMcmLocal" type="checkbox" />
            <span class="text-sm text-tinta-suave">A la dirección de mi MCM Local</span>
          </label>

          <label class="block sm:col-span-2">
            <span class="mb-1 block text-xs text-tinta-suave">Dirección de envío</span>
            <input
              v-model="formulario.direccion"
              type="text"
              :disabled="usarDireccionMcmLocal && hayDireccionMcmLocal"
              class="w-full rounded-lg border border-borde bg-lienzo px-3 py-2 text-sm outline-none focus:border-acento disabled:opacity-60"
            />
          </label>

          <label class="block">
            <span class="mb-1 block text-xs text-tinta-suave">Población</span>
            <input
              v-model="formulario.poblacion"
              type="text"
              :disabled="usarDireccionMcmLocal && hayDireccionMcmLocal"
              class="w-full rounded-lg border border-borde bg-lienzo px-3 py-2 text-sm outline-none focus:border-acento disabled:opacity-60"
            />
          </label>

          <label class="block">
            <span class="mb-1 block text-xs text-tinta-suave">Código postal</span>
            <input
              v-model="formulario.codigoPostal"
              type="text"
              inputmode="numeric"
              :disabled="usarDireccionMcmLocal && hayDireccionMcmLocal"
              class="w-full rounded-lg border border-borde bg-lienzo px-3 py-2 text-sm outline-none focus:border-acento disabled:opacity-60"
            />
          </label>
        </div>
      </section>

      <section class="space-y-3 rounded-tarjeta border border-borde bg-lienzo-alto p-4">
        <h2 class="font-medium">Cómo te lo hacemos llegar</h2>

        <div
          class="rounded-lg border p-3 transition"
          :class="
            formulario.transporte === 'consolacion' ? 'border-acento bg-acento/5' : 'border-borde'
          "
        >
          <label class="flex cursor-pointer gap-3">
            <input v-model="formulario.transporte" type="radio" value="consolacion" class="mt-1" />
            <span>
              <span class="block text-sm font-medium">Transporte Consolación · gratis</span>
              <span class="block text-xs text-tinta-suave">
                Te llegará cuando alguien de la Familia Consolación vaya para allá.
              </span>
            </span>
          </label>

          <!--
            Fuera del <label> a propósito: un label sólo debe asociarse a un
            control, y aquí abajo hay otros dos (la fecha y su checkbox).
          -->
          <div v-if="formulario.transporte === 'consolacion'" class="mt-3 pl-7">
            <p class="mb-1 text-xs text-tinta-suave">¿Para qué fecha lo necesitas como muy tarde?</p>
            <div class="flex flex-wrap items-center gap-2">
              <input
                v-model="formulario.fechaLimite"
                type="date"
                :min="hoy"
                :disabled="sinFechaConcreta"
                class="rounded-lg border border-borde bg-lienzo px-3 py-1.5 text-sm outline-none focus:border-acento disabled:opacity-50"
              />
              <label class="flex items-center gap-1.5 text-xs text-tinta-suave">
                <input v-model="sinFechaConcreta" type="checkbox" />
                No tengo una fecha concreta
              </label>
            </div>
          </div>
        </div>

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

        <!-- B2C: los tres métodos a la vista, tarjeta un poco destacada -->
        <div v-if="modo === 'b2c'" class="space-y-2.5">
          <label
            class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition"
            :class="formaDePago === 'bizum' ? 'border-acento bg-acento/5' : 'border-borde'"
          >
            <input v-model="formaDePago" type="radio" value="bizum" />
            <IconoBizum class="size-9 shrink-0" />
            <span>
              <span class="block text-sm font-medium">Bizum ONG</span>
              <span class="block text-xs text-tinta-suave">
                Te damos el código en cuanto confirmes.
              </span>
            </span>
          </label>

          <label
            class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition"
            :class="formaDePago === 'transferencia' ? 'border-acento bg-acento/5' : 'border-borde'"
          >
            <input v-model="formaDePago" type="radio" value="transferencia" />
            <IconoTransferencia class="size-9 shrink-0" />
            <span>
              <span class="block text-sm font-medium">Transferencia bancaria</span>
              <span class="block text-xs text-tinta-suave">
                Te damos el IBAN en cuanto confirmes.
              </span>
            </span>
          </label>

          <label
            class="relative flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition"
            :class="
              formaDePago === 'tarjeta'
                ? 'border-acento bg-acento/5'
                : 'border-acento/30 hover:border-acento/60'
            "
          >
            <span
              class="absolute -top-2.5 right-3 rounded-full bg-acento px-2 py-0.5 text-[10px] font-semibold text-sobre-acento"
            >
              Al instante
            </span>
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

        <!-- B2B: transferencia por delante, el resto en "otros métodos" -->
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
                Te damos el IBAN en cuanto confirmes.
              </span>
            </span>
          </label>

          <p
            v-if="formaDePago === 'transferencia'"
            class="rounded-lg bg-lienzo px-3 py-2 text-xs text-tinta-suave"
          >
            Recuerda que el pago debe efectuarse desde las cuentas del MCM, si están disponibles.
          </p>

          <button
            type="button"
            class="text-sm text-tinta-suave underline-offset-2 hover:text-tinta hover:underline"
            @click="otrosMetodosAbierto = !otrosMetodosAbierto"
          >
            {{ otrosMetodosAbierto ? 'Ocultar' : 'Otros métodos de pago' }}
          </button>

          <div v-if="otrosMetodosAbierto" class="mcm-animar-entrada space-y-2.5">
            <label
              class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition"
              :class="formaDePago === 'bizum' ? 'border-acento bg-acento/5' : 'border-borde'"
            >
              <input v-model="formaDePago" type="radio" value="bizum" />
              <IconoBizum class="size-9 shrink-0" />
              <span>
                <span class="block text-sm font-medium">Bizum ONG</span>
                <span class="block text-xs text-tinta-suave">
                  Te damos el código en cuanto confirmes.
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
