/**
 * Sesión en una cookie firmada. No hay base de datos ni tabla de usuarios: lo
 * único que guardamos de una persona es su email y, si lo tiene, su contacto de
 * Holded. Todo lo demás vive en el ERP.
 */

import { SignJWT, jwtVerify } from 'jose'
import type { H3Event } from 'h3'

const COOKIE = 'mcm_sesion'
const DURACION_DIAS = 30

export interface Sesion {
  email: string
  nombre: string | null
  /** Contacto de Holded que corresponde a ese email, si existe. */
  contactoId: string | null
  /** True si el contacto lleva el tag `mcmlocal`: es una delegación. */
  esDelegacion: boolean
}

function clave(): Uint8Array {
  const { sessionSecret } = useRuntimeConfig()
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error('NUXT_SESSION_SECRET debe existir y tener al menos 32 caracteres.')
  }
  return new TextEncoder().encode(sessionSecret)
}

export async function guardarSesion(event: H3Event, sesion: Sesion): Promise<void> {
  const token = await new SignJWT({ ...sesion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_DIAS}d`)
    .sign(clave())

  setCookie(event, COOKIE, token, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * DURACION_DIAS,
  })
}

export async function leerSesion(event: H3Event): Promise<Sesion | null> {
  const token = getCookie(event, COOKIE)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, clave())
    return {
      email: String(payload.email),
      nombre: payload.nombre ? String(payload.nombre) : null,
      contactoId: payload.contactoId ? String(payload.contactoId) : null,
      esDelegacion: Boolean(payload.esDelegacion),
    }
  } catch {
    // Firma inválida o caducada: se trata como si no hubiera sesión.
    return null
  }
}

export function borrarSesion(event: H3Event): void {
  deleteCookie(event, COOKIE, { path: '/' })
}
