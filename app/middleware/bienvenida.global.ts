/**
 * Quien todavía no ha dicho para quién compra pasa primero por la bienvenida.
 *
 * Sólo la primera vez: la elección se guarda en cookie durante un año. Y sólo en
 * la portada, para no secuestrar un enlace directo a "Mis pedidos" o al checkout
 * que alguien haya guardado.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (to.path !== '/') return

  const cookieElegido = useCookie<'1' | null>('mcm_modo_elegido')
  if (cookieElegido.value === '1') return

  return navigateTo('/bienvenida')
})
