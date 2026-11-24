import { z } from 'zod'
import { limitarPeticiones } from '../../utils/limite'
import { abrirTpv, claveTpvCorrecta, tpvConfigurado } from '../../utils/tpv'

/** Entrar al TPV con la clave del equipo. */
export default defineEventHandler(async (event) => {
  // Una clave corta se adivina probando: diez intentos cada diez minutos por IP.
  await limitarPeticiones(event, { clave: 'tpv-entrar', maximo: 10, ventanaSegundos: 600 })

  if (!tpvConfigurado()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'El TPV no tiene clave configurada (NUXT_TPV_CLAVE en Vercel).',
    })
  }

  const { clave } = z.object({ clave: z.string().max(100) }).parse(await readBody(event))
  if (!claveTpvCorrecta(clave)) {
    throw createError({ statusCode: 401, statusMessage: 'Esa no es la clave del TPV.' })
  }

  await abrirTpv(event)
  return { ok: true }
})
