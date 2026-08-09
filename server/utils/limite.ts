/**
 * Límite de peticiones por IP.
 *
 * El endpoint de pedidos es público y cada llamada puede crear un contacto y un
 * pedido en Holded. Sin freno, cualquiera puede llenar el ERP de basura en un
 * minuto. No se busca parar un ataque serio, sólo que un script tonto o un botón
 * pulsado veinte veces no acabe en veinte pedidos.
 */

import type { H3Event } from 'h3'

interface Ventana {
  cuenta: number
  expira: number
}

export async function limitarPeticiones(
  event: H3Event,
  opciones: { clave: string; maximo: number; ventanaSegundos: number },
): Promise<void> {
  const ip =
    getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    getRequestHeader(event, 'x-real-ip') ||
    'desconocida'

  const almacen = useStorage('limites')
  const clave = `${opciones.clave}:${ip}`
  const ahora = Date.now()

  const actual = await almacen.getItem<Ventana>(clave)

  if (actual && actual.expira > ahora) {
    if (actual.cuenta >= opciones.maximo) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Has hecho muchas peticiones seguidas. Espera un minuto y vuelve a probar.',
      })
    }
    await almacen.setItem(clave, { cuenta: actual.cuenta + 1, expira: actual.expira })
    return
  }

  await almacen.setItem(clave, {
    cuenta: 1,
    expira: ahora + opciones.ventanaSegundos * 1000,
  })
}
