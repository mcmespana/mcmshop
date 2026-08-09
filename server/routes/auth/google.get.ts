/**
 * Arranque del login de Google. Sin librería de auth: son dos redirecciones.
 *
 * El login es el último paso y es opcional para todo el mundo. Sirve para
 * precargar datos y ver el histórico, no para dejar pedir.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  if (!config.googleClientId) {
    throw createError({ statusCode: 503, statusMessage: 'El login con Google no está configurado.' })
  }

  // `state` protege de CSRF: se guarda en cookie y se compara a la vuelta.
  const state = crypto.randomUUID()
  setCookie(event, 'mcm_oauth_state', state, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })

  // A dónde volver después de entrar.
  const destino = getQuery(event).destino
  if (typeof destino === 'string' && destino.startsWith('/')) {
    setCookie(event, 'mcm_oauth_destino', destino, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    })
  }

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', config.googleClientId)
  url.searchParams.set('redirect_uri', `${config.public.siteUrl}/auth/google/callback`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)

  return sendRedirect(event, url.toString())
})
