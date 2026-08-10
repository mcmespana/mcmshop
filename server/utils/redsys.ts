/**
 * TPV Virtual de Redsys (Banco Sabadell).
 *
 * Sólo criptografía y formato: quién cobra y cuándo se decide en los endpoints.
 *
 * El protocolo es viejo y raro, así que conviene tenerlo claro:
 *
 *   1. Los datos del pago van en JSON, en base64, en `Ds_MerchantParameters`.
 *   2. La clave de firma de ESTA operación se deriva cifrando el número de pedido
 *      con 3DES usando la clave secreta del comercio. Sí, 3DES en 2026.
 *   3. La firma es un HMAC-SHA256 de los parámetros en base64 con esa clave.
 *
 * **3DES no existe en runtime edge.** Las rutas que usen esto tienen que ir a
 * runtime Node; está forzado en nuxt.config.ts.
 */

import { createCipheriv, createHmac, timingSafeEqual } from 'node:crypto'

/** Autorización normal: se cobra en el momento. */
const TRANSACCION_AUTORIZACION = '0'
/** Euro, según ISO 4217. */
const MONEDA_EURO = '978'

export const URL_PRUEBAS = 'https://sis-t.redsys.es:25443/sis/realizarPago'
export const URL_PRODUCCION = 'https://sis.redsys.es/sis/realizarPago'

export interface DatosPago {
  /** Número de pedido: 4 a 12 caracteres, y los 4 primeros deben ser dígitos. */
  numeroPedido: string
  importeCentimos: number
  descripcion: string
  urlNotificacion: string
  urlOk: string
  urlKo: string
  titular?: string
}

export interface FormularioRedsys {
  url: string
  Ds_SignatureVersion: 'HMAC_SHA256_V1'
  Ds_MerchantParameters: string
  Ds_Signature: string
}

function base64Url(texto: string): Buffer {
  return Buffer.from(texto.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

/**
 * Deriva la clave de esta operación cifrando el número de pedido con 3DES-CBC y
 * vector de inicialización a cero, usando la clave secreta del comercio.
 * Es lo que especifica Redsys, IV de ceros incluido.
 */
function claveDeOperacion(claveComercio: string, numeroPedido: string): Buffer {
  const clave = base64Url(claveComercio)
  const cifrador = createCipheriv('des-ede3-cbc', clave, Buffer.alloc(8))
  cifrador.setAutoPadding(false)

  // 3DES trabaja en bloques de 8 bytes: se rellena con ceros hasta múltiplo de 8.
  const bytes = Buffer.from(numeroPedido, 'utf8')
  const relleno = Buffer.alloc(Math.ceil(bytes.length / 8) * 8)
  bytes.copy(relleno)

  return Buffer.concat([cifrador.update(relleno), cifrador.final()])
}

function firmar(parametrosBase64: string, claveOperacion: Buffer): string {
  return createHmac('sha256', claveOperacion).update(parametrosBase64).digest('base64')
}

/**
 * Prepara el formulario que se envía por POST a Redsys.
 * El navegador lo autoenvía; no hay llamada servidor a servidor en este paso.
 */
export function prepararPago(datos: DatosPago): FormularioRedsys {
  const { redsysComercio, redsysTerminal, redsysClave, redsysEntorno } = useRuntimeConfig()

  if (!redsysComercio || !redsysClave) {
    throw createError({ statusCode: 503, statusMessage: 'El pago con tarjeta no está configurado.' })
  }
  if (!/^\d{4}[\w]{0,8}$/.test(datos.numeroPedido)) {
    throw new Error(
      `Número de pedido no válido para Redsys: "${datos.numeroPedido}". ` +
        'Debe tener entre 4 y 12 caracteres y empezar por 4 dígitos.',
    )
  }

  const parametros = {
    DS_MERCHANT_AMOUNT: String(datos.importeCentimos),
    DS_MERCHANT_ORDER: datos.numeroPedido,
    // String() explícito: un FUC como "999008881" llega desde el entorno convertido
    // a número, y Redsys lo rechaza si no es una cadena.
    DS_MERCHANT_MERCHANTCODE: String(redsysComercio),
    DS_MERCHANT_CURRENCY: MONEDA_EURO,
    DS_MERCHANT_TRANSACTIONTYPE: TRANSACCION_AUTORIZACION,
    DS_MERCHANT_TERMINAL: String(redsysTerminal || '001'),
    DS_MERCHANT_MERCHANTURL: datos.urlNotificacion,
    DS_MERCHANT_URLOK: datos.urlOk,
    DS_MERCHANT_URLKO: datos.urlKo,
    DS_MERCHANT_PRODUCTDESCRIPTION: datos.descripcion.slice(0, 125),
    ...(datos.titular ? { DS_MERCHANT_TITULAR: datos.titular.slice(0, 60) } : {}),
  }

  const parametrosBase64 = Buffer.from(JSON.stringify(parametros), 'utf8').toString('base64')

  return {
    url: redsysEntorno === 'produccion' ? URL_PRODUCCION : URL_PRUEBAS,
    Ds_SignatureVersion: 'HMAC_SHA256_V1',
    Ds_MerchantParameters: parametrosBase64,
    Ds_Signature: firmar(parametrosBase64, claveDeOperacion(redsysClave, datos.numeroPedido)),
  }
}

export interface RespuestaRedsys {
  numeroPedido: string
  /** 0000–0099 significa autorizada. Cualquier otro código es un rechazo. */
  codigoRespuesta: string
  autorizada: boolean
  importeCentimos: number
  codigoAutorizacion: string | null
}

/**
 * Verifica y decodifica la notificación de Redsys.
 *
 * **Esta es la única fuente fiable de que algo se ha pagado.** La vuelta del
 * navegador a la URL de OK no vale: el cliente puede cerrar la pestaña, o
 * escribir esa URL a mano.
 *
 * Devuelve null si la firma no cuadra, y entonces no hay que creerse nada.
 */
export function verificarNotificacion(cuerpo: {
  Ds_MerchantParameters?: string
  Ds_Signature?: string
}): RespuestaRedsys | null {
  const { redsysClave } = useRuntimeConfig()
  const { Ds_MerchantParameters: parametros, Ds_Signature: firmaRecibida } = cuerpo

  if (!parametros || !firmaRecibida || !redsysClave) return null

  let datos: Record<string, string>
  try {
    datos = JSON.parse(base64Url(parametros).toString('utf8'))
  } catch {
    return null
  }

  const numeroPedido = datos.Ds_Order
  if (!numeroPedido) return null

  // La firma de la notificación usa base64 URL-safe, no el base64 normal del envío.
  const esperada = firmar(parametros, claveDeOperacion(redsysClave, numeroPedido))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  const a = Buffer.from(esperada)
  const b = Buffer.from(firmaRecibida)
  // Comparación en tiempo constante: comparar firmas con === filtra información.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  const codigo = datos.Ds_Response ?? ''
  const numero = Number(codigo)

  return {
    numeroPedido,
    codigoRespuesta: codigo,
    autorizada: Number.isFinite(numero) && numero >= 0 && numero <= 99,
    importeCentimos: Number(datos.Ds_Amount) || 0,
    codigoAutorizacion: datos.Ds_AuthorisationCode ?? null,
  }
}

/**
 * Número de pedido válido para Redsys a partir de una marca de tiempo y un
 * sufijo aleatorio: 4 dígitos por delante y como mucho 12 caracteres.
 */
export function numeroPedidoRedsys(ahora: number, aleatorio: string): string {
  const base = String(ahora).slice(-8)
  return (base + aleatorio.replace(/[^a-zA-Z0-9]/g, '')).slice(0, 12)
}
