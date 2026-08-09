# Hallazgos sobre los datos reales de Holded

Reconocimiento de solo lectura contra la API v2, 9 de agosto de 2026.
Cierra la sección 10 de `PRIMEROS_PASOS.md`. Las conclusiones aquí **corrigen** varias
suposiciones del brief original.

## Resumen ejecutivo

| Pendiente del brief | Estado |
|---|---|
| ¿Tallas como `variants` o productos sueltos? | ✅ Son `variants`. **No hace falta migración** |
| ¿Existen los tags `b2b` / `b2c`? | ❌ **No existen.** Bloqueante para el catálogo |
| ¿Imágenes binario o URL? | ✅ **URL pública**, con 5 tamaños. Sin proxy |
| Inventariar catálogo | ✅ 18 productos, 49 variantes, 2 almacenes |
| Límites de la API | ⏭️ Descartado por decisión del equipo |
| Crear `sales_channel` propio | ⚠️ **No conviene** (ver abajo) |
| Webhooks | ✅ Se pueden crear por API (`POST /api/v2/webhooks`) |

## Autenticación

`Authorization: Bearer <API_KEY>`, base `https://api.holded.com`, prefijo `/api/v2`.
Paginación con `?cursor=` + `?limit=` (máx. 100); la respuesta trae `{ cursor, has_more }`.
Ojo: el campo es `cursor`, **no** `next_cursor`.

## Catálogo: 18 productos

8 `simple`, 10 `variants`, 49 variantes en total. Todos con `for_sale: true`.

### 1. Las tallas son variantes, pero no están estructuradas

Buena noticia: no hay que migrar nada, ya es `kind: "variants"`.

Mala noticia: **las 49 variantes tienen `options: []` vacío y no tienen nombre.**
El color y la talla solo existen dentro de cadenas de texto, y cada producto usa un
convenio distinto:

| Producto | Dónde vive la etiqueta | Ejemplo | Eje real |
|---|---|---|---|
| Camisetas M+C (22) | `barcode` | `Camiseta M+C Azul Royal XL` | color + talla |
| Sudaderas M+C (4) | `barcode` | `Sudadera M+C Talla S` | talla |
| Sudaderas LC (6) | `barcode` | `Sudadera LC Naranja S` | color + talla |
| Pañuelos MCM (4) | `barcode` | `Pañuelo COM Verde` | tipo/color, **sin talla** |
| Cuelga móviles (2) | `sku` (barcode vacío) | `BLANCO`, `ROJO` | color |
| Guías del COM (2) | `sku` (barcode vacío) | `CONOC. I`, `CRECIM. III` | edición |
| Chapas Antiguas (3) | `sku` | `CHAP-AMA`, `CHAP-VER` | color codificado |
| Libros Estatutos (2) | `sku` | `EST-OLD`, `EST-NEW` | edición |

Consecuencias para el portal:

- El selector no puede ser siempre "talla". El eje de variación **cambia según el producto**.
- El `sku` **no es identificador único**: las 6 variantes de Sudaderas LC comparten `SUD-LC`.
  Hay que usar el `id` de variante como clave, siempre.
- Los SKU están truncados de forma inconsistente (`CAM-MC-Gran-M` = Granate,
  `CAM-MC-Morad-XL` vs `CAM-MC-Morado-L`). El `barcode` es la fuente fiable cuando existe.

**Enfoque elegido:** un resolvedor de etiqueta con cadena de respaldo
`barcode` → `sku` → `"Opción N"`, más una normalización de tallas conocidas
(S/M/L/XL/XXL) para que los productos que sí tienen tallas muestren un selector de tallas
de verdad, y el resto muestre un selector genérico de opción. Degrada sin romperse: una
variante que no encaje en ningún patrón se muestra con su etiqueta cruda en lugar de fallar.

### 2. Los tags `b2b` / `b2c` no existen

Tags actualmente en uso en productos: `camisetasmc` (2), `panuelos` (1). Y nada más:
**15 de 18 productos no tienen ningún tag.**

Además `for_sale: true` está en los 18, así que ese campo no sirve para separar lo vendible
de lo interno. Y hay claramente cosas que no deberían salir en una tienda:

- `Bolsas de plástico`, `Bolsa de imperdibles`, `Bolsa de cintas rojas (pequeñas)` — material interno
- `Pañuelos OLD`, `Guías del COM - OLD` — descatalogados
- `Camisetas Random` — sin definir

**Esto es bloqueante para el catálogo público** y solo se resuelve etiquetando en Holded.

### 3. Precios: solo 6 de 18 productos tienen precio utilizable

Confirmado que el campo `price` **es** la "Tarifa principal" del panel. El array `rates`
contiene las otras dos tarifas (`Gratis`, `Coste real`), que por decisión del equipo se ignoran.

Con precio real: Camisetas M+C (4,00), Sudaderas M+C (12,00), Pañuelos MCM (2,00).
A cero: Sudaderas LC, Cuelga móviles. Sin precio (`null`): los 8 `simple` y otros 5.

**12 productos no se pueden vender hoy** porque no tienen precio.

### 4. Ningún producto tiene impuestos configurados

Los 18 tienen `taxes: []`. Como la API guarda las líneas tal y como se envían, hay que
decidir explícitamente qué IVA lleva cada línea del pedido — o confirmar que la actividad
está exenta y enviarlo sin impuestos, que es lo que refleja el catálogo actual.

### 5. Imágenes: URLs públicas, sin proxy

`GET /api/v2/products/{id}/images` devuelve JSON con URLs de Google Cloud Storage
(bucket `public-permanent`) en 5 tamaños: `original`, `large` (1280), `medium` (600),
`small` (250), `thumbnail` (65). Se pasan directas a `@nuxt/image`.

Cobertura: 16 de 18 productos tienen al menos una foto. Sin foto: `Guías del COM`,
`Cruces Laicos`.

## Contactos: 153

Por tipo: 120 `supplier`, 23 sin tipo, 6 `lead`, 4 `client`. 48 con email.

### El tag `mcmlocal` ya identifica a las delegaciones

10 contactos lo llevan, y son exactamente las delegaciones:

Caravaca, Quintanar, Onda, Vila-real, Burriana, Castellón, L'Alcora, Espinardo,
Villacañas, Zaragoza.

Esto resuelve la sección 6 del brief sin inventar nada: si un usuario entra con Google y su
contacto lleva el tag `mcmlocal`, se le propone modo B2B. El modo lo sigue eligiendo el
usuario, pero el valor por defecto sale de un dato real.

**Dos incidencias de datos encontradas:**

1. `MCM Quintanar` tiene el email `quintanar@movilmientoconsolacion.com` —
   dominio mal escrito (`movilmiento`). Con ese dato, el login de Google de Quintanar
   nunca casaría con su contacto.
2. `MCM Zaragoza` no tiene email, así que tampoco se puede resolver por login.

### Búsqueda de contacto por email: disponible

`GET /api/v2/contacts?email=<exacto>` filtra por email exacto. Es lo que necesita el
checkout. (Existe además `/api/v2/contacts/search`.)

Ningún contacto tiene el campo `rate` asignado, lo que es coherente con la decisión de
usar siempre la Tarifa principal.

## Almacenes, canales y numeración

**Almacenes (2):** `ECE Castellón` (por defecto) y `ECE Madrid`.
El stock se lleva por almacén, así que hay que decidir de cuál tira el portal.

**Canales de venta (8):** aquí el brief se equivoca. Los canales no marcan el origen de la
venta, sino la **cuenta contable por línea de producto**: `Camisetas MC` → 70800002,
`Pañuelos MCM` → 70800001, `Sudaderas MC` → 70800003, `Guías del COM` → 70000004.

Usar `sales_channel_id` para marcar "viene del portal", como propone el brief, **rompería
esa separación contable**. Alternativa recomendada: etiquetar el pedido con un tag
(`tienda-web`) y/o darle una serie de numeración propia.

**Numeración de pedidos:** una sola serie, `Línea SO`, formato `PED-MAT-[YY]-%%`,
con `last: 7`. Es decir, 7 pedidos de venta históricos: el volumen es pequeño y una serie
propia para el portal deja el histórico limpio desde el día uno.

## Pedidos: cómo se escriben las líneas

Comprobado contra los 7 pedidos históricos reales, no sólo contra el esquema.

### Tres correcciones al brief

1. **El array de líneas se llama `items` al escribir y `lines` al leer.** La misma
   entidad, dos nombres según la dirección. Fácil de no ver hasta que falla.

2. **`shipping` no es un tipo de línea válido.** El brief afirmaba lo contrario
   ("es un tipo de línea nativo, corrige una decisión anterior"). En la v2 el enum de
   `type` acepta sólo `product`, `service` y `title` — en pedidos, facturas,
   presupuestos y albaranes por igual. El transporte tiene que ir como `service`.

3. **`price` es numérico** en la petición, aunque en las respuestas venga como cadena
   con coma decimal.

### `variant_id` existe, pero no está documentado

El esquema del POST no lo incluye; el modelo de lectura sí lo trae poblado:

```json
{
  "name": "Sudaderas M+C",
  "description": "S, Azul",
  "product_id": "67a639e257b175f81d0e2776",
  "variant_id": "67a639e257b175f81d0e2778",
  "sku": "SUD-MC-S",
  "units": "3,00",
  "price": "12,00"
}
```

Se enviará igualmente. Y como red de seguridad, la variante viaja **además** en
`description`, con el mismo formato que el equipo ya escribe a mano (`"S, Azul"`):
si Holded ignorase el campo, el pedido seguiría siendo perfectamente legible en el
panel. Esto importa porque el `sku` no es identificador único (las 6 Sudaderas LC
comparten `SUD-LC`), así que no se puede depender de él para resolver la variante.

### El equipo ya etiqueta los pedidos

Los pedidos existentes llevan tags como `mcmlocal` y `sudaderasmc`, tanto en el
documento como en cada línea. Marcar los pedidos del portal con un tag propio
(`tienda-web`) encaja con lo que ya se hace y evita tocar `sales_channel_id`, que
está reservado a la cuenta contable.

### Confirmado: no se aplica IVA

Los pedidos reales tienen `tax: "0"` y `taxes: []`, igual que el catálogo. El portal
enviará las líneas sin impuestos, salvo indicación contraria.

## Webhooks

`POST /api/v2/webhooks` con `{ url, events[], version, description }`. Eventos confirmados
que interesan: `product.create`, `product.update`, `product.delete`, `stock.update`,
`contact.create`, `contact.update`, `contact.delete`.

Se dejarán configurados cuando el portal esté desplegado y tenga URL pública. Requiere una
clave con permiso de escritura.

## Decisiones que necesitan al equipo

1. **Etiquetar el catálogo** con `b2b` / `b2c`. Sin esto no hay catálogo público.
2. **Poner precio** a los productos que se vayan a vender (12 sin precio hoy).
3. **IVA**: ¿exento, o hay que aplicar un tipo a las líneas?
4. **Almacén** del que tira el portal: ¿Castellón, o suma de los dos?
5. Corregir el email de MCM Quintanar y añadir el de MCM Zaragoza.
