/**
 * TPV del equipo: acceso y registro de ventas rápidas.
 *
 * El acceso es una clave compartida (`NUXT_TPV_CLAVE`), no una cuenta de Google
 * por persona: en un puesto se pasa el móvil de mano en mano y nadie va a
 * iniciar sesión con la suya. Quien la mete una vez queda dentro 30 días en ese
 * dispositivo, con una cookie firmada que el navegador no puede leer.
 *
 * Desde aquí se crean pedidos que dicen "cobrado" o "entregado" sin que nadie
 * lo compruebe, así que por defecto NO queda abierto: sin clave configurada, el
 * TPV está cerrado para todo el mundo.
 *
 * Excepción deliberada y temporal: `NUXT_TPV_LIBRE=true` lo abre sin clave,
 * para los primeros eventos mientras el equipo se acostumbra. Cerrarlo es
 * quitar esa variable en Vercel y redesplegar; la clave sigue puesta.
 */

/** TPV abierto a cualquiera, sin clave. Decisión del equipo, ver arriba. */
export function tpvLibre(): boolean {
  // Nuxt convierte "true" de la variable de entorno en booleano, pero por si
  // llega como texto (pegado a mano con espacios, por ejemplo) se acepta igual.
  return String(useRuntimeConfig().tpvLibre).trim() === 'true'
}

import { SignJWT, jwtVerify } from 'jose'
import { timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const COOKIE = 'mcm_tpv'
const DIAS = 30

function claveFirma(): Uint8Array {
  const { sessionSecret } = useRuntimeConfig()
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error('NUXT_SESSION_SECRET debe existir y tener al menos 32 caracteres.')
  }
  // Prefijo distinto al de la sesión de Google: una cookie no vale por la otra.
  return new TextEncoder().encode(`tpv:${sessionSecret}`)
}

export function tpvConfigurado(): boolean {
  if (tpvLibre()) return true
  return String(useRuntimeConfig().tpvClave ?? '').trim().length >= 4
}

export function claveTpvCorrecta(intento: string): boolean {
  const buena = String(useRuntimeConfig().tpvClave ?? '').trim()
  if (buena.length < 4) return false
  const a = Buffer.from(intento.trim())
  const b = Buffer.from(buena)
  // Comparación en tiempo constante, como con las firmas de Redsys.
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function abrirTpv(event: H3Event): Promise<void> {
  const token = await new SignJWT({ tpv: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${DIAS}d`)
    .sign(claveFirma())
  setCookie(event, COOKIE, token, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * DIAS,
  })
}

export function cerrarTpv(event: H3Event): void {
  deleteCookie(event, COOKIE, { path: '/' })
}

export async function tpvAbierto(event: H3Event): Promise<boolean> {
  if (tpvLibre()) return true
  if (!tpvConfigurado()) return false
  const token = getCookie(event, COOKIE)
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, claveFirma())
    return payload.tpv === true
  } catch {
    return false
  }
}

/** Corta la petición si quien llama no ha entrado al TPV. */
export async function exigirTpv(event: H3Event): Promise<void> {
  if (!(await tpvAbierto(event))) {
    throw createError({ statusCode: 401, statusMessage: 'Hay que entrar al TPV con la clave.' })
  }
}
