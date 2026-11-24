import { z } from 'zod'
import { formatearEuros } from '../../utils/dinero'
import { crearPedido, esMcmLocal, obtenerContacto } from '../../utils/holded'
import { siguienteNumero } from '../../utils/numeracion'
import { etiquetaPago, prepararLineas, resolverContacto } from '../../utils/pedido'
import { exigirTpv } from '../../utils/tpv'
import { eventoActivo } from '../../../shared/utils/eventos'

/**
 * Una venta registrada desde el TPV: en un puesto, por teléfono o donde sea.
 *
 * Lo que la diferencia de un pedido web es que quien la apunta es el equipo y
 * sabe cosas que la web no puede saber: si ya está cobrada, y si el material se
 * ha entregado o se queda reservado (porque no hay stock, o porque lo recoge
 * otro día). Todo eso va a Holded como etiquetas y en la nota, para gestionarlo
 * después allí.
 */
const esquema = z.object({
  claveIdempotencia: z.string().min(8).max(100),
  /** Evento en el que se vende; sin él es una venta suelta (teléfono, oficina…). */
  evento: z.string().max(60).optional(),
  canal: z.enum(['evento', 'telefono', 'otro']),
  lineas: z
    .array(
      z.object({
        productoId: z.string().min(1),
        varianteId: z.string().min(1).nullable(),
        cantidad: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(60),
  cliente: z.object({
    nombre: z.string().max(120).optional(),
    email: z.email().optional(),
    telefono: z.string().max(40).optional(),
    localidad: z.string().max(120).optional(),
    /** Si la venta es para una MCM Local, su contacto de Holded. */
    delegacionId: z
      .string()
      .regex(/^[a-f0-9]{24}$/)
      .optional(),
  }),
  pago: z.enum(['efectivo', 'bizum', 'tarjeta', 'transferencia', 'pendiente']),
  entrega: z.enum(['entregado', 'reservado']),
  notas: z.string().max(1000).optional(),
})

const TEXTO_PAGO = {
  efectivo: 'efectivo — COBRADO en mano',
  bizum: 'Bizum — COBRADO (comprobar que ha llegado)',
  tarjeta: 'tarjeta — COBRADO en datáfono',
  transferencia: 'transferencia — SIN COBRAR, hay que pasarle los datos',
  pendiente: 'SIN COBRAR — pagará más tarde',
} as const

const TEXTO_CANAL = { evento: 'en el puesto', telefono: 'por teléfono', otro: 'a mano' } as const

export default defineEventHandler(async (event) => {
  await exigirTpv(event)

  const validacion = esquema.safeParse(await readBody(event))
  if (!validacion.success) {
    throw createError({ statusCode: 400, statusMessage: 'Faltan datos de la venta.' })
  }
  const datos = validacion.data

  const evento = eventoActivo(datos.evento)
  if (datos.evento && !evento) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ese evento ya no está publicado. Elige otro o "sin evento".',
    })
  }

  // El botón se pulsa con prisa y la wifi de un pabellón es la que es: un
  // reintento no puede apuntar la venta dos veces.
  const almacen = useStorage('pedidos')
  const clave = `tpv:${datos.claveIdempotencia}`
  const yaHecho = await almacen.getItem<{ id: string; numero: string; totalCentimos: number }>(clave)
  if (yaHecho) return { ...yaHecho, repetido: true }

  // Sin transporte: lo vendido en el TPV se entrega en mano o se reserva.
  const { lineas, totalCentimos } = await prepararLineas(datos.lineas, 'en-mano')

  const { cliente } = datos
  const nombreBase = cliente.nombre?.trim() || (evento ? `Venta en ${evento.nombre}` : 'Venta TPV')
  const nombre = cliente.localidad?.trim() ? `${nombreBase} (${cliente.localidad.trim()})` : nombreBase

  let contactoId: string
  let esDelegacion = false
  let nombreDelegacion = ''
  if (cliente.delegacionId) {
    const contacto = await obtenerContacto(cliente.delegacionId).catch(() => null)
    if (!contacto || !esMcmLocal(contacto)) {
      throw createError({ statusCode: 400, statusMessage: 'Esa MCM Local no existe.' })
    }
    contactoId = contacto.id
    esDelegacion = true
    nombreDelegacion = contacto.name
  } else {
    contactoId = await resolverContacto(
      { nombre, email: cliente.email, telefono: cliente.telefono, poblacion: cliente.localidad },
      'b2c',
    )
  }

  const numero = await siguienteNumero(evento?.id ?? 'tpv')
  const cobrado = ['efectivo', 'bizum', 'tarjeta'].includes(datos.pago)

  const notas = [
    evento
      ? `Venta del TPV en «${evento.nombre}», nº ${numero}.`
      : `Venta del TPV ${TEXTO_CANAL[datos.canal]}, nº ${numero}.`,
    `Pago: ${TEXTO_PAGO[datos.pago]}.`,
    datos.entrega === 'entregado'
      ? 'Entrega: ENTREGADO en mano.'
      : 'Entrega: RESERVADO — pendiente de entregar.',
    esDelegacion && cliente.nombre ? `Persona: ${cliente.nombre}.` : null,
    cliente.telefono ? `Teléfono: ${cliente.telefono}.` : null,
    cliente.email ? `Correo: ${cliente.email}.` : null,
    datos.notas ? `Nota: ${datos.notas}` : null,
    `Total: ${formatearEuros(totalCentimos)}.`,
  ]
    .filter(Boolean)
    .join('\n')

  const pedido = await crearPedido({
    contact_id: contactoId,
    items: lineas,
    tags: [
      'tpv',
      esDelegacion ? 'mcmlocal' : 'particular',
      ...(evento ? ['evento', `evento-${evento.id}`] : [`canal-${datos.canal}`]),
      etiquetaPago(datos.pago),
      cobrado ? 'cobrado' : 'sin-cobrar',
      datos.entrega,
    ],
    description: `${evento?.nombre ?? 'TPV'} · nº ${numero} · ${esDelegacion ? nombreDelegacion : nombre}`,
    notes: notas,
  })

  const resultado = { id: pedido.id, numero, totalCentimos }
  await almacen.setItem(clave, resultado)
  return { ...resultado, repetido: false }
})
