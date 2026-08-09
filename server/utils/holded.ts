/**
 * Cliente de la API v2 de Holded.
 *
 * Holded es la única fuente de verdad del proyecto: catálogo, stock, contactos y
 * pedidos. Aquí sólo hay transporte y tipos; el modelo de dominio se arma en
 * `catalogo.ts`.
 */

const BASE = 'https://api.holded.com/api/v2'

export class ErrorHolded extends Error {
  constructor(
    readonly estado: number,
    readonly ruta: string,
    readonly cuerpo: string,
  ) {
    super(`Holded ${estado} en ${ruta}: ${cuerpo.slice(0, 300)}`)
    this.name = 'ErrorHolded'
  }
}

interface OpcionesPeticion {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  consulta?: Record<string, string | number | undefined>
  cuerpo?: unknown
}

async function peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const { holdedApiKey } = useRuntimeConfig()
  if (!holdedApiKey) {
    throw new Error('Falta HOLDED_API_KEY: el portal no puede hablar con Holded.')
  }

  const url = new URL(BASE + ruta)
  for (const [clave, valor] of Object.entries(opciones.consulta ?? {})) {
    if (valor !== undefined) url.searchParams.set(clave, String(valor))
  }

  const respuesta = await fetch(url, {
    method: opciones.metodo ?? 'GET',
    headers: {
      Authorization: `Bearer ${holdedApiKey}`,
      Accept: 'application/json',
      ...(opciones.cuerpo ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
  })

  if (!respuesta.ok) {
    throw new ErrorHolded(respuesta.status, ruta, await respuesta.text().catch(() => ''))
  }
  return (await respuesta.json()) as T
}

/**
 * Recorre todas las páginas de un listado.
 * La respuesta de Holded pagina con `{ cursor, has_more }` — no con `next_cursor`.
 */
async function listarTodo<T>(
  ruta: string,
  consulta: Record<string, string | number | undefined> = {},
): Promise<T[]> {
  const items: T[] = []
  let cursor: string | undefined
  // Tope de seguridad: 50 páginas × 100 = 5.000 registros.
  for (let pagina = 0; pagina < 50; pagina++) {
    const datos = await peticion<{ items: T[]; cursor?: string | null; has_more?: boolean }>(ruta, {
      consulta: { ...consulta, limit: 100, cursor },
    })
    items.push(...(datos.items ?? []))
    if (!datos.has_more || !datos.cursor) break
    cursor = datos.cursor
  }
  return items
}

// ── Productos ────────────────────────────────────────────────────────────────

export interface VarianteHolded {
  id: string
  sku: string | null
  barcode: string | null
  price: string | null
  stock: string | null
  archived: boolean
}

export interface EntradaStock {
  warehouse_id: string
  variant_id: string | null
  stock: string
}

export interface ProductoHolded {
  id: string
  kind: 'simple' | 'variants' | 'lots' | 'pack' | 'serialnumbers'
  name: string
  description: string | null
  sku: string | null
  barcode: string | null
  price: string | null
  taxes: string[]
  tags: string[]
  has_stock: boolean
  stock: string | null
  stocks: EntradaStock[] | null
  for_sale: boolean
  archived: boolean
  variants: VarianteHolded[] | null
}

export function listarProductos(): Promise<ProductoHolded[]> {
  return listarTodo<ProductoHolded>('/products')
}

export interface ImagenHolded {
  id: string
  position: number
  url: string
  description: string | null
  sizes: Record<string, { url: string; width: number; height: number }> | null
}

export async function listarImagenes(idProducto: string): Promise<ImagenHolded[]> {
  const datos = await peticion<{ items: ImagenHolded[] }>(`/products/${idProducto}/images`)
  return datos.items ?? []
}

// ── Contactos ────────────────────────────────────────────────────────────────

export interface ContactoHolded {
  id: string
  name: string
  email: string | null
  code: string | null
  tags: string[]
  type: string | null
  is_person: boolean
  bill_address: {
    address: string | null
    city: string | null
    province: string | null
    postal_code: string | null
    country_code: string | null
  } | null
}

/** Busca por email exacto. Devuelve null si no existe. */
export async function buscarContactoPorEmail(email: string): Promise<ContactoHolded | null> {
  const datos = await peticion<{ items: ContactoHolded[] }>('/contacts', {
    consulta: { email: email.trim().toLowerCase(), limit: 1 },
  })
  return datos.items?.[0] ?? null
}

export interface NuevoContacto {
  name: string
  email: string
  code?: string | null
  is_person?: boolean
  type?: 'client'
  bill_address?: Record<string, string | null>
}

export async function crearContacto(datos: NuevoContacto): Promise<{ id: string }> {
  return peticion<{ id: string }>('/contacts', { metodo: 'POST', cuerpo: datos })
}

// ── Pedidos ──────────────────────────────────────────────────────────────────

/**
 * Línea de pedido.
 *
 * Todo esto está comprobado creando un pedido real contra la API, no leyendo el
 * esquema:
 *
 * 1. Al **escribir** el array se llama `items`; al **leer**, `lines`.
 * 2. `shipping` NO es un tipo de línea válido en la v2 (el enum sólo acepta
 *    `product`, `service` y `title`), al contrario de lo que decía el brief.
 *    El transporte va como línea de tipo `service`.
 * 3. **`variant_id` se ignora al crear**: se envía y vuelve `null`. Aparece en el
 *    modelo de lectura, pero no se puede fijar desde la API.
 * 4. **El `sku` de la línea también se pisa** con el del producto padre: se envió
 *    `PAN-COM-VER` y Holded guardó `PAN-`.
 * 5. El pedido nace como **borrador y sin número**. El número se asigna al
 *    aprobarlo (`POST /sales-orders/{id}/approve`).
 * 6. Los guiones de los tags se eliminan: `tienda-web` se guarda `tiendaweb`.
 *
 * Consecuencia de 3 y 4: `description` es el **único** sitio donde sobrevive qué
 * variante se ha pedido. Por eso lleva la etiqueta y además el SKU de la variante.
 */
export interface LineaPedido {
  type: 'product' | 'service' | 'title'
  product_id?: string
  variant_id?: string
  name: string
  description?: string
  units: number
  /** Precio unitario numérico. Holded guarda lo que se le envía, no lo relee del producto. */
  price: number
  sku?: string
  taxes?: string[]
}

export interface NuevoPedido {
  contact_id: string
  date?: string
  items: LineaPedido[]
  notes?: string
  description?: string
  tags?: string[]
  number_line_id?: string
  warehouse_id?: string
  custom_fields?: Array<{ field: string; value: string }>
}

export async function crearPedido(datos: NuevoPedido): Promise<{ id: string }> {
  return peticion<{ id: string }>('/sales-orders', { metodo: 'POST', cuerpo: datos })
}

/**
 * Aprueba un pedido: deja de ser borrador y recibe número de la serie
 * (`PED-MAT-26-08`). Es irreversible en el sentido de que consume numeración.
 */
export async function aprobarPedido(id: string): Promise<void> {
  await peticion(`/sales-orders/${id}/approve`, { metodo: 'POST' })
}

/** Estados que devuelve Holded para un pedido de venta. */
export type EstadoPedido =
  | 'pending'
  | 'completed'
  | 'partial'
  | 'cancelled'
  | 'failed'
  | 'overdue'

export interface LineaLeida {
  name: string
  description: string | null
  type: string
  units: string
  price: string
  sku: string | null
}

export interface PedidoLeido {
  id: string
  document_number: string | null
  contact_id: string
  date: string | null
  status: EstadoPedido | null
  draft: boolean
  approved_at: string | null
  total: string
  subtotal: string
  tax: string
  /** Ojo: `shipping` no es un importe, es el modo de dirección ("billing"). */
  tracking_name: string | null
  tracking_number: string | null
  delivery_date: string | null
  description: string | null
  /** Al leer las líneas se llaman `lines`; al escribirlas, `items`. */
  lines: LineaLeida[] | null
}

/** Pedidos de un contacto, del más reciente al más antiguo. */
export async function listarPedidosDeContacto(
  contactoId: string,
  limite = 50,
): Promise<PedidoLeido[]> {
  const datos = await peticion<{ items: PedidoLeido[] }>('/sales-orders', {
    consulta: { contact_id: contactoId, limit: limite, sort: '-date' },
  })
  return datos.items ?? []
}

export function obtenerPedido(id: string): Promise<PedidoLeido> {
  return peticion<PedidoLeido>(`/sales-orders/${id}`)
}

/** Descarga el PDF del pedido. Devuelve el binario tal cual lo da Holded. */
export async function descargarPdfPedido(id: string): Promise<ArrayBuffer> {
  const { holdedApiKey } = useRuntimeConfig()
  const respuesta = await fetch(`${BASE}/sales-orders/${id}/pdf`, {
    headers: { Authorization: `Bearer ${holdedApiKey}` },
  })
  if (!respuesta.ok) {
    throw new ErrorHolded(respuesta.status, `/sales-orders/${id}/pdf`, '')
  }
  return respuesta.arrayBuffer()
}

// ── Webhooks ─────────────────────────────────────────────────────────────────

export function crearWebhook(datos: {
  url: string
  events: string[]
  description?: string
}): Promise<unknown> {
  return peticion('/webhooks', { metodo: 'POST', cuerpo: { ...datos, version: 'v1' } })
}

export function listarWebhooks(): Promise<unknown> {
  return peticion('/webhooks')
}
