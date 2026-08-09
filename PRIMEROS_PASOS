# Tienda MCM — Portal de pedidos sobre Holded

Brief completo del proyecto. Este documento es el punto de partida para la implementación.

---

## 1. Qué es

Un portal web de pedidos para la Asociación Juvenil Movimiento Consolación para el Mundo (MCM).
Hoy los pedidos de merchandising (camisetas, sudaderas, españoletas, libros) se gestionan
íntegramente a mano dentro de Holded: alguien pide por WhatsApp o correo, el equipo técnico crea
el documento en Holded, se convierte en recibo, se cobra, se envía y el stock se descuenta solo.
Todo ese flujo funciona bien y **no se toca**.

Lo que falta es la parte de delante: un sitio donde las delegaciones locales y las personas
particulares puedan **ver qué hay, ver si hay stock, y pedirlo ellos mismos**.

### Dos públicos

| | B2B | B2C |
|---|---|---|
| Quién | Delegaciones locales del MCM | Monitores y personas físicas |
| Ejemplo | `castellon@movimientoconsolacion.com` | cualquier correo |
| Pago | Transferencia (99% de los casos) | Bizum ONG → luego TPV Redsys |
| Volumen | Pedidos grandes (12 camisetas, 20 españoletas) | Pedidos pequeños |
| Contacto en Holded | Ya existe, lista cerrada, casi nunca se crean nuevos | Puede no existir |

**Ojo:** el dominio `@movimientoconsolacion.com` **no** identifica a una delegación. Hay personas
con correo del dominio (`david@movimientoconsolacion.com`). No se puede usar el dominio como
heurística de tipo de cliente. El modo lo elige el usuario, no el sistema.

### Objetivo de producto

> Experiencia de usuario ultra simple **pero cuidadísima**. Para la gente que pide, y para
> nosotros mismos que luego lo vemos en Holded.

Simple no significa sencillo de hacer. Significa pocos clicks, cero fricción, y un nivel de
acabado visual que se note.

---

## 2. Stack

| Capa | Decisión |
|---|---|
| Framework | **Nuxt 4** (Vue 3) |
| Hosting | **Vercel** |
| Caché | Nitro (`defineCachedFunction`) + route rules `isr` + Vercel KV |
| Imágenes | `@nuxt/image` (optimización automática en Vercel) |
| Estilos | Tailwind |
| Auth | Google OAuth 2.0 directo. Sin Supabase, sin Auth0, sin NextAuth |
| Sesión | Cookie firmada (JWT con `jose`) |
| Validación | `zod` |
| Base de datos | **Ninguna** |
| Backoffice | Holded. No se construye panel de admin |

### Por qué Nuxt

- Nitro trae `defineCachedFunction` con semántica stale-while-revalidate de serie: sirve lo
  cacheado al instante y refresca por detrás usando `event.waitUntil`, sin que el usuario espere.
- En Vercel se usa la route rule `isr` (no `swr`) para aprovechar la caché nativa de Vercel.
- Nitro integra Vercel KV de forma nativa.
- `@nuxt/image` + optimización on-demand de Vercel resuelve las fotos de producto.

### Alternativas descartadas

- **Next.js** — descartado por preferencia explícita.
- **SvelteKit** — buena opción técnica, descartada porque ya se ha usado en otro proyecto.
- **TanStack Start** — lo más nuevo, pero sigue en RC de la v1 desde septiembre 2025 sin 1.0
  estable a mediados de 2026. Demasiados bordes ásperos para un proyecto donde el acabado importa.
- **Astro 5 + server islands** — conceptualmente precioso (catálogo estático + islas dinámicas
  de stock), descartado porque el carrito y el checkout son muy interactivos y la frontera
  isla/no-isla daría guerra justo en la parte que más hay que pulir.

---

## 3. Arquitectura

```
Usuario
  ↓
Portal Nuxt (Vercel)
  ├── lee catálogo  → Vercel KV (caché)  ←── webhook Holded (stock/productos)
  │                                      ←── cron de resync (red de seguridad)
  └── crea pedido   → API Holded ────────→ dispara emails
```

**Holded es la única fuente de verdad.** Catálogo, stock, contactos, pedidos, contabilidad.
El portal no tiene base de datos propia. KV solo guarda una copia cacheada del catálogo.

### Estrategia de caché

Tres capas, en orden de importancia:

1. **Webhook** — Holded emite eventos de catálogo, productos y stock. Endpoint en el portal que
   actualiza KV al instante cuando algo cambia. Es el mecanismo principal.
2. **Stale-while-revalidate al entrar** — en KV se guarda `{ productos, stock, actualizadoEn }`.
   El usuario siempre recibe lo cacheado de inmediato. Si `actualizadoEn` tiene más de ~10 min,
   se lanza el refresco contra la API de Holded en segundo plano. El usuario no espera nunca.
3. **Cron de resync** — cada 30 min, por si algún webhook se pierde.

**La comprobación que sí es bloqueante:** justo antes de crear el pedido, una llamada directa a
Holded para verificar stock real de las líneas del carrito. Una sola llamada por pedido, no por
visita. Evita que dos delegaciones se lleven la última talla M.

Nota: Holded v2 aplica límites de uso a la API, así que el polling constante no es viable. Por eso
los webhooks son la capa principal y no un extra.

---

## 4. Hallazgos reales del MCP de Holded

Explorado el 9 de agosto de 2026. **Limitación encontrada: el servidor MCP expone los productos
solo en escritura.** Hay `create_product`, `update_product`, `update_product_stock`,
`upload_product_image` y `delete_product`, pero **no hay `list_products` ni `get_product`**.
No se pudo listar el catálogo real ni verificar los tags existentes.

> **Pendiente:** añadir herramientas de lectura de productos al MCP, o consultar la API REST
> directamente para inventariar el catálogo actual.

Lo que sí se confirmó desde los esquemas:

### Productos

- `kind` acepta: `simple`, `variants`, `lots`, `pack`, `serialnumbers`.
  **`variants` está descrito explícitamente como productos con atributos (color/talla).**
- `update_product_stock` acepta `variant_id` → **el stock se controla por variante**.
- `tags: array` existe en producto → el filtro `b2b` / `b2c` es viable tal cual.
- Campos disponibles: `name`, `description`, `sku`, `barcode`, `price`, `cost`, `purchase_price`,
  `taxes`, `for_sale`, `for_purchase`, `has_stock`, `stock`.
- Variantes llevan sus propios `sku`, `price`, `stock`, `barcode`, `weight`.

> **Pendiente crítico:** verificar si las tallas están modeladas como `kind: 'variants'` o como
> productos independientes. Si es lo segundo, migrar a variantes **antes** de empezar el portal.
> El selector de tallas depende enteramente de esto.

### Líneas de documento

Cada línea tiene un `type` que acepta: `product`, `service`, `title`, **`shipping`**, `rounding`,
`refund`, `ecotax`, `wrapping`.

**`shipping` es un tipo de línea nativo.** No hace falta crear productos ficticios de transporte.
(Corrige una decisión anterior del diseño.)

Otros campos de línea: `product_id`, `name`, `description`, `units`, `price`, `discount`,
`taxes` (ej. `s_iva_21`), `sku`, `account`, `project_id`.

Nota importante de la API: los valores de cada línea se guardan **tal y como se envían**. Holded
no los relee desde la ficha del producto. Hay que mandar precio e impuestos explícitamente.

### Pedidos (`create_sales_order`)

**Obligatorio: `contact_id` de un contacto que ya exista.** No se puede crear un pedido con datos
sueltos de un cliente nuevo. Esto condiciona el checkout sin login (ver sección 6).

Campos opcionales relevantes:

| Campo | Uso en el proyecto |
|---|---|
| `sales_channel_id` | Marcar todos los pedidos como venidos del portal. Filtrado de un vistazo en Holded |
| `number_line_id` | Serie de numeración propia (ej. `TIENDA-2026-0001`) |
| `custom_fields` | Persona de contacto del pedido B2B |
| `warehouse_id` | Almacén de origen |
| `notes` | Notas internas, solo visibles para el equipo |
| `description` | Texto libre visible |
| `tags` | Etiquetar el pedido |
| `due_date` | Fecha de entrega esperada |
| `project_id` | Vincular a proyecto/subvención si aplica |

### Imágenes

`upload_product_image` existe (multipart, jpeg/png/gif, máx. 200 por producto), pero **no hay
herramienta de lectura en el MCP**. La API REST v2 sí tiene los endpoints:

- `GET /api/v2/products/{productId}/image` — imagen principal
- `GET /api/v2/products/{productId}/images` — todas
- `GET /api/v2/products/{productId}/images/{imageId}`

> **Pendiente:** comprobar si devuelven binario o URL. Si es binario, hace falta un endpoint proxy
> en el portal que las sirva y cachee; si es URL, se pasan directas a `@nuxt/image`.

---

## 5. Modelo de datos y flujo

### Catálogo

Filtrado por tag de producto:

- tag `b2b` → visible en modo delegación
- tag `b2c` → visible en modo particular
- ambos tags → visible en los dos

El criterio vive en Holded. Sacar producto nuevo no requiere tocar código.

### Pedido

1. Usuario navega el catálogo (desde KV, instantáneo).
2. Añade al carrito con talla y cantidad, sin salir de la tarjeta.
3. Checkout: datos, transporte, pago.
4. Verificación de stock real contra Holded.
5. Resolución de contacto (ver sección 6).
6. `create_sales_order` con `sales_channel_id` del portal y línea `shipping` si aplica.
7. Emails: confirmación al cliente + aviso al equipo.
8. A partir de aquí, el flujo actual de Holded sigue igual: recibo, cobro, envío, stock.

---

## 6. Auth e identidad

**Principio: el login es el último paso y es opcional para todos.**

A las delegaciones se les invita con más fuerza (les da acceso al histórico y a los datos
precargados), pero si alguien está en el móvil sin la cuenta a mano, que pida igual. La validación
de que el pedido es real la hace el equipo después, en Holded. No se bloquea a nadie.

### Google OAuth directo

Dos rutas, sin librería de auth pesada:

- `/auth/google` — redirige a Google
- `/auth/google/callback` — intercambia el code, lee el email

Se puede usar `arctic` (helpers de OAuth, sin backend propio) o hacerlo a pelo. La sesión va en
una cookie firmada con `jose`: `{ email, holdedContactId, modo }`. Sin tablas, sin base de datos.

### Resolución de contacto en Holded

Como `create_sales_order` exige un `contact_id` existente:

| Caso | Acción |
|---|---|
| Usuario logueado, email coincide con contacto | Usar ese `contact_id`. Precargar dirección, CIF, y mostrar histórico |
| Usuario sin login, email coincide con contacto | Usar ese `contact_id` |
| Email no existe en Holded | Crear el contacto antes del pedido, con los datos del checkout |

Se recomienda crear el contacto real en lugar de usar un genérico "Cliente web": deja el CRM
limpio y hace que el histórico por email funcione solo, sin lógica adicional.

### Selección de modo

Como el dominio del correo no es fiable para distinguir delegación de persona, **el modo lo elige
el usuario**. Selector discreto y persistente (cookie), cambiable desde el header. No conviene una
pantalla de bienvenida a pantalla completa que bloquee la entrada al catálogo.

Si el usuario entra con Google y su contacto está identificado como delegación, se propone el modo
B2B por defecto, pero se puede cambiar (alguien de una delegación puede querer hacer un pedido
personal).

---

## 7. Pagos

### Fase 1

- **B2B — transferencia.** El pedido se crea en Holded pendiente de pago. El email incluye IBAN y
  referencia. Cero integración.
- **B2C — Bizum ONG.** No es una integración con API; funciona con código de donación/pago. Mismo
  tratamiento: pedido pendiente, email con el código y las instrucciones. La conciliación es
  manual en Holded. Asumible para el volumen de B2C.

### Fase 1.5 — TPV Virtual Redsys (Banco Sabadell)

Ya existe una integración hecha en otro sitio; portarla es cuestión de horas.

Flujo: formulario con `Ds_SignatureVersion`, `Ds_MerchantParameters` (base64) y `Ds_Signature`,
firmado con HMAC-SHA256 sobre una clave derivada por 3DES del número de pedido. POST a Redsys,
notificación de vuelta a un endpoint propio, verificación de firma, y el pedido nace ya pagado.

**Aviso técnico:** el 3DES puede dar problemas en runtime edge. Forzar esa ruta concreta a runtime
Node en Vercel. Nada dramático, pero hay que decidirlo al configurar el endpoint.

---

## 8. Transporte

Dos opciones, como línea de documento `type: 'shipping'`.

### Transporte Consolación — gratis

> Te llegará cuando alguien de la Familia Consolación vaya para allá.

### Mensajería urgente — precio no anunciado

**Nunca se muestra un precio.** No se sabe de antemano y no se va a inventar. Copy propuesto:

> Te lo enviamos por agencia. El coste depende del destino y del peso; te lo confirmamos por
> correo antes de enviar nada.

El pedido se crea sin línea de transporte, con una nota. Cuando el equipo sabe el coste, añade la
línea en Holded. Que es lo que ya se hace hoy.

Importante: no dejar el hueco vacío ni poner "a consultar" a secas. Explicar **por qué** no se
sabe el precio es lo que hace que se sienta honesto en vez de descuidado.

---

## 9. Diseño y UX

El objetivo declarado es que se note el cuidado. Patrones concretos:

### Catálogo

- **Selector de talla inline en la tarjeta de producto.** Sin página de detalle, sin navegación.
- **Tallas sin stock: tachadas, no ocultas.** El usuario entiende que existe pero no hay.
- **Stepper de cantidad en la propia tarjeta.** En B2B nadie pide 1 camiseta, pide 12. Obligar a
  añadir y luego editar el carrito es un click desperdiciado por producto.
- **Fotos de producto tratadas en serio.** `@nuxt/image`, WebP/AVIF, responsive, lazy, placeholder
  mientras carga. Es lo que más diferencia una tienda cuidada de una plantilla.
- **Indicador de stock por talla** visible y honesto.

### Carrito

- **Lateral persistente, nunca una página aparte.** Columna fija en desktop, barra inferior
  desplegable en móvil.
- **Optimistic UI:** al añadir, la tarjeta responde al instante; la petición vuela por detrás.
- Badge visible con el modo actual (ej. "MCM Castellón") para que nunca haya duda de para quién
  es el pedido.

### Checkout

- **Una sola pantalla.** Datos, transporte, pago, confirmar. Un scroll, un botón.
- Si hay sesión de Google, datos precargados desde el contacto de Holded.
- Sin login: email + nombre + dirección, y ya.

### General

- **Mobile-first de verdad.** Los monitores lo van a abrir desde el móvil.
- Búsqueda con `⌘K` aunque el catálogo sea pequeño: cuesta poco y da sensación de producto serio.
- **Copy con carácter.** El tono del MCM, no el de una tienda genérica. Ver los ejemplos de
  transporte en la sección 8.

---

## 10. Tareas pendientes de investigación

Bloqueantes o casi, a resolver antes o al principio de la implementación:

1. **¿Cómo están modeladas las tallas en Holded?** ¿`kind: 'variants'` o productos sueltos?
   Determina todo el selector de tallas. Si están sueltos, valorar migración.
2. **¿Están puestos los tags `b2b` / `b2c` en los productos?** Si no, hay que etiquetar el
   catálogo.
3. **¿Las imágenes vuelven como binario o como URL?** Determina si hace falta un endpoint proxy.
4. **Inventariar el catálogo real:** cuántos productos, cuántas variantes, qué almacenes hay.
5. **Añadir herramientas de lectura de productos al MCP de Holded** (`list_products`,
   `get_product`, `get_product_stock`, `get_product_images`) — útil para esta investigación y para
   el futuro.
6. **Crear en Holded:** un `sales_channel` para el portal y una serie de numeración propia.
7. **Configurar los webhooks** de catálogo/stock apuntando al endpoint del portal.
8. **Comprobar el límite de uso de la API v2** en la cuenta (Configuración → Desarrolladores →
   Uso de la API) para dimensionar la estrategia de caché.

---

## 11. Dependencias del proyecto

```
nuxt
@nuxt/image
tailwindcss
arctic        # helpers OAuth de Google
jose          # firma de cookies de sesión
zod           # validación
```

Y para de contar. Sin ORM, sin base de datos, sin panel de admin, sin librería de auth con
backend. El panel de admin es Holded, que el equipo ya sabe usar.

---

## 12. Referencias

- API Holded v2 — https://www.holded.com/es/desarrolladores/referencia-api
- Nuxt en Vercel — https://vercel.com/docs/frameworks/full-stack/nuxt
- Caché en Nuxt/Nitro — https://hub.nuxt.com/docs/cache/usage
- MCP Holded (ya conectado en el entorno del equipo)
