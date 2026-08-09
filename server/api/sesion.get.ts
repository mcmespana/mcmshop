import { leerSesion } from '../utils/sesion'

/** Quién está dentro, si es que hay alguien. El login es opcional en todo el portal. */
export default defineEventHandler(async (event) => {
  const sesion = await leerSesion(event)
  if (!sesion) return { autenticado: false as const }

  return {
    autenticado: true as const,
    email: sesion.email,
    nombre: sesion.nombre,
    esDelegacion: sesion.esDelegacion,
    tieneContacto: sesion.contactoId !== null,
  }
})
