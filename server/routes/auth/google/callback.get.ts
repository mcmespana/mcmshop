import { buscarContactoPorEmail } from '../../../utils/holded'
import { guardarSesion } from '../../../utils/sesion'

interface RespuestaToken {
  id_token?: string
  access_token?: string
}

interface PerfilGoogle {
  email?: string
  email_verified?: boolean
  name?: string
}

/**
 * Lee el payload de un JWT sin verificar la firma: el token viene directo de
 * Google por HTTPS en el intercambio del código, no del navegador.
 *
 * Con APIs web en vez de Buffer, para que funcione también en runtime edge. El
 * TextDecoder importa: sin él, "Martín" o "Muñoz" vuelven rotos.
 */
function leerPayload(idToken: string): PerfilGoogle {
  const trozo = idToken.split('.')[1]
  if (!trozo) return {}

  const base64 = trozo.replace(/-/g, '+').replace(/_/g, '/')
  const relleno = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')

  const binario = atob(relleno)
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as PerfilGoogle
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { code, state } = getQuery(event)

  const estadoEsperado = getCookie(event, 'mcm_oauth_state')
  deleteCookie(event, 'mcm_oauth_state', { path: '/' })

  if (!code || typeof code !== 'string' || !state || state !== estadoEsperado) {
    throw createError({ statusCode: 400, statusMessage: 'Login no válido. Inténtalo otra vez.' })
  }

  const respuesta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: `${config.public.siteUrl}/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!respuesta.ok) {
    throw createError({ statusCode: 502, statusMessage: 'Google no ha aceptado el login.' })
  }

  const { id_token } = (await respuesta.json()) as RespuestaToken
  if (!id_token) {
    throw createError({ statusCode: 502, statusMessage: 'Google no ha devuelto la identidad.' })
  }

  const perfil = leerPayload(id_token)
  if (!perfil.email || perfil.email_verified === false) {
    throw createError({ statusCode: 400, statusMessage: 'Ese correo de Google no está verificado.' })
  }

  // Se busca el contacto en Holded para precargar datos y proponer modo.
  // Que no exista no es un problema: se creará al hacer el pedido.
  let contactoId: string | null = null
  let esDelegacion = false
  try {
    const contacto = await buscarContactoPorEmail(perfil.email)
    if (contacto) {
      contactoId = contacto.id
      // El tag `mcmlocal` ya identifica a las 10 delegaciones en Holded.
      esDelegacion = (contacto.tags ?? []).includes('mcmlocal')
    }
  } catch {
    // Si Holded no responde, se entra igual: el login no puede depender del ERP.
  }

  await guardarSesion(event, {
    email: perfil.email,
    nombre: perfil.name ?? null,
    contactoId,
    esDelegacion,
  })

  const destino = getCookie(event, 'mcm_oauth_destino')
  deleteCookie(event, 'mcm_oauth_destino', { path: '/' })

  return sendRedirect(event, destino?.startsWith('/') ? destino : '/')
})
