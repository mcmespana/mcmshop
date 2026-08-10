# Puesta en marcha

Todo lo que hay que hacer para que la tienda esté en producción, ordenado por lo que
bloquea a lo que puede esperar. Lo que está hecho en código no aparece aquí; esto es
la lista de lo que necesita una persona con acceso a Holded, Google o el banco.

---

## 1. Bloqueante: etiquetar el catálogo en Holded

**Sin esto la tienda sale vacía.** Es intencionado: que un producto aparezca a la venta
tiene que ser una decisión explícita, no lo que pasa por defecto.

En cada producto que quieras vender, añade el tag:

- `b2b` → lo ven las delegaciones
- `b2c` → lo ven los particulares
- los dos → lo ven todos

Mayúsculas y minúsculas dan igual (`B2B`, `b2b` y ` B2B ` valen lo mismo).

Mientras pruebas, `NUXT_CATALOGO_SIN_FILTRO=true` se salta el filtro y muestra todo.
**En producción tiene que quedar en `false`.**

### Precios

Un producto sin tarifa principal, o con la tarifa a 0, **se muestra como Gratis**.
Eso es a propósito para poder regalar cosas, pero revisa la lista: hoy hay 10 productos
activos sin precio y algunos son casi seguro un descuido, no un regalo.

Están en `/api/catalogo` bajo `diagnostico.avisos`.

### Fotos por color (opcional, pero barato y se nota)

El portal ya lee la **descripción de cada imagen** en Holded. Si escribes ahí el nombre
del color (`Granate`, `Azul Royal`), la tarjeta cambia sola a esa foto cuando alguien
elige ese color. Hoy las 27 descripciones están vacías, así que no hace nada.

### Rótulos de variante

Las variantes no tienen datos estructurados: el color y la talla se leen del `barcode`.
El convenio actual (`Camiseta M+C Azul Royal XL`) funciona perfecto y **no hay que
tocarlo**. Sólo si algún día pones a la venta las Guías, Chapas o Estatutos, dales un
`barcode` legible en vez de dejarlos con el SKU (`EST-OLD` se ve tal cual).

### Datos a corregir

- **MCM Quintanar** tiene el correo `quintanar@movilmientoconsolacion.com` — el dominio
  está mal escrito, así que su login de Google nunca casaría con su contacto.
- **MCM Zaragoza** no tiene email: no se le puede resolver el contacto por login.
- Queda un **pedido de prueba** que hay que borrar: `6a7903a0aad33d885005a320`
  (MCM Castellón, 4,00 €, nota "PEDIDO DE PRUEBA — borrar").

---

## 2. Bloqueante: variables de entorno

Copia `.env.example` a `.env` en local, y mételas en Vercel para producción.

### Holded

`NUXT_HOLDED_API_KEY` — Holded → Configuración → Desarrolladores → API.

Permisos mínimos que necesita el portal:

| Permiso | Para qué |
|---|---|
| `inventory:products.read` | catálogo, stock e imágenes |
| `contacts:contacts.read` | buscar el contacto por email |
| `contacts:contacts.write` | crear el contacto si no existe |
| `sales:orders.read` | página de "Mis pedidos" y el PDF |
| `sales:orders.write` | crear el pedido |
| `developers:webhooks.write` | registrar los webhooks (sólo una vez) |

### Sesión

`NUXT_SESSION_SECRET` — cadena aleatoria larga, mínimo 32 caracteres:

```
openssl rand -base64 48
```

### Webhook

`NUXT_WEBHOOK_SECRET` — otra cadena aleatoria. Holded **no firma** sus webhooks, así
que este secreto en la URL es la única protección contra que alguien envenene la caché.

### Almacén

`NUXT_WAREHOUSE_ID` — de qué almacén sale el stock. Vacío = suma de todos.

- ECE Castellón: `63e1a26d17932443220d4e95`
- ECE Madrid: `677a68306cb5ce3b380b7496`

> Aparece un tercer almacén (`677a67deda196cb92708d293`) en los datos de stock que no
> está en la lista de almacenes. Todo su stock es 0. Probablemente esté archivado.

---

## 3. Bloqueante: Google OAuth

El login está escrito pero **no se ha podido probar** porque hace falta el client ID.

1. Entra en <https://console.cloud.google.com/> → crea un proyecto (o usa el que ya tengáis).
2. **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - Tipo: **Externo**.
   - Nombre de la app, correo de soporte y datos de contacto.
   - Ámbitos: sólo `openid`, `email` y `profile`. Con eso no hace falta verificación de
     Google, que es lo que se llevaría semanas.
   - Si la dejas en modo *Testing*, sólo entran los correos que añadas a mano. Para
     abrirla a todo el mundo hay que **publicarla**.
3. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**:
   - Orígenes autorizados: `https://TU-DOMINIO`
   - **URI de redirección autorizada**: `https://TU-DOMINIO/auth/google/callback`
     (exacta, con la barra y sin barra final; es el error más común)
   - Para local, añade también `http://localhost:3000/auth/google/callback`
4. Copia el ID y el secreto a `NUXT_GOOGLE_CLIENT_ID` y `NUXT_GOOGLE_CLIENT_SECRET`.
5. `NUXT_PUBLIC_SITE_URL` tiene que coincidir **exactamente** con el dominio de la URI
   de redirección, porque el callback se construye a partir de ella.

Recuerda: el login es **opcional** en todo el portal. Sirve para precargar datos y ver
el histórico, no para dejar pedir.

---

## 4. Correos (Resend)

1. Crea la cuenta en <https://resend.com> y **verifica el dominio**
   `movimientoconsolacion.com` (registros DNS que te da Resend: SPF y DKIM).
   Sin dominio verificado sólo se puede enviar a tu propia dirección.
2. Crea una API key → `NUXT_RESEND_API_KEY`.
3. `NUXT_CORREO_REMITENTE` → p. ej. `Tienda MCM <tienda@movimientoconsolacion.com>`.
   Tiene que estar en el dominio verificado.
4. `NUXT_CORREO_EQUIPO` → dónde queréis recibir el aviso de pedido nuevo.

Si Resend no está configurado, el portal **no falla**: crea el pedido igual y deja un
aviso en el log. Los correos nunca tumban una venta.

---

## 5. Desplegar en Vercel

1. Conecta el repositorio. Nuxt se detecta solo, no hay que configurar comandos.
2. Mete todas las variables de entorno del punto 2, 3 y 4.
3. **Almacenamiento**: el portal usa `useStorage` para tres cosas — la caché del
   catálogo, las claves de idempotencia de pedidos y el límite de peticiones por IP.
   En un servidor único el driver por defecto vale; **en Vercel, con varias instancias,
   hace falta un almacén compartido** (Redis del Marketplace, o KV). Sin él, cada
   instancia tendría su propia caché y su propio contador de límite.

   Vercel movió su KV al Marketplace (Upstash Redis), así que comprueba cómo se llama
   ahora antes de configurarlo.

### Webhooks de Holded (después del despliegue, necesita la URL pública)

```
POST https://api.holded.com/api/v2/webhooks
Authorization: Bearer <API_KEY>

{
  "url": "https://TU-DOMINIO/api/webhooks/holded?clave=<NUXT_WEBHOOK_SECRET>",
  "events": ["product.create", "product.update", "product.delete", "stock.update"],
  "version": "v1",
  "description": "Tienda MCM — invalidar caché del catálogo"
}
```

Comprobado que funciona: con la clave mal da 401, un evento de factura no invalida nada
y `stock.update` sí invalida.

### Cron de resync (recomendado)

Red de seguridad por si se pierde un webhook. En `vercel.json`, cada 30 minutos, que
llame al endpoint del webhook con un evento `product.update`. Hoy la caché ya caduca
sola a los 5 minutos, así que esto es opcional de verdad.

---

## 6. Redsys — TPV Virtual de Banco Sabadell

**El código está escrito y funcionando.** Sólo faltan las credenciales: en cuanto las
metas en las variables de entorno, se puede cobrar.

### Lo que tienes que pedirle a Sabadell

Pídelo todo de una vez, que si no son tres correos:

| Dato | Qué es | Variable |
|---|---|---|
| **Número de comercio (FUC)** | 9 dígitos | `NUXT_REDSYS_COMERCIO` |
| **Número de terminal** | normalmente `001` | `NUXT_REDSYS_TERMINAL` |
| **Clave secreta de firma SHA-256** | cadena en base64 | `NUXT_REDSYS_CLAVE` |

Y además, **dilo explícitamente en el correo**:

1. Que quieres **acceso al entorno de pruebas** además del de producción.
   **Son dos claves distintas** — usar la de producción contra el entorno de pruebas
   falla con un error de firma que no dice por qué, y se pierde media tarde ahí.
2. Que el terminal tenga activada la **notificación online** (URL de comercio /
   `Ds_Merchant_MerchantURL`). Sin ella no os enteráis de un pago si el cliente cierra
   la pestaña al terminar, que pasa constantemente.
3. Que el terminal admita **HMAC_SHA256_V1** (es el estándar actual; si os dan uno
   configurado en SHA-1 antiguo, que lo cambien).

Cuando las tengas: `NUXT_REDSYS_ENTORNO=pruebas` primero, y sólo `produccion` cuando
hayas hecho una compra de prueba entera.

### Cómo probarlo sin pagar de verdad

Con `NUXT_REDSYS_ENTORNO=pruebas` el portal apunta a
`https://sis-t.redsys.es:25443/sis/realizarPago`, que es el entorno de pruebas de
Redsys: **no hay dinero real, no hay cargos, no hay tarjetas reales**. Puedes pagar
mil veces sin que se mueva un céntimo.

Ahí se paga con las **tarjetas de prueba** que da Redsys. Los valores habituales:

| Campo | Valor |
|---|---|
| Número | `4548 8120 4940 0004` |
| Caducidad | cualquier fecha futura (p. ej. `12/34`) |
| CVV | `123` |
| Clave de autenticación (3DS) | `123456` |

> Estos valores los publica Redsys y **los cambia de vez en cuando**. Si esa tarjeta
> te da error, pide a Sabadell la ficha de tarjetas de prueba vigente en lugar de
> pelearte con ella: no es un fallo del código.

Para forzar un **rechazo** y comprobar que la vuelta KO funciona, usa un importe cuyos
últimos dígitos correspondan a un código de error, o simplemente mete un CVV
equivocado. Interesa probar los dos caminos, no sólo el feliz.

**El problema del `localhost`:** la notificación la manda Redsys **a tu servidor**, no
el navegador, así que apuntando a `http://localhost:3000` nunca llega. Para probar en
local hace falta un túnel público:

```bash
npx untun@latest tunnel http://localhost:3000
# y pon NUXT_PUBLIC_SITE_URL con la URL https que te dé
```

O más simple: prueba directamente sobre el despliegue de vista previa de Vercel, que ya
tiene URL pública.

### Cómo está montado

Dos endpoints:

- `POST /api/pago/iniciar` — recalcula el importe **en el servidor** releyendo el
  catálogo (para que nadie pague 1 céntimo por una sudadera editando la petición),
  guarda el pedido pendiente y devuelve el formulario firmado para Redsys.
- `POST /api/pago/notificacion` — verifica la firma y, sólo si el banco confirma el
  cobro, crea el pedido en Holded ya marcado como cobrado.

**El pedido se crea al cobrar, no antes.** Así, quien abandona el TPV a medias no deja
un pedido fantasma en el ERP, y quien paga tiene su pedido guardado con la referencia
de autorización aunque Holded fallase en ese momento. La notificación es idempotente:
Redsys reintenta si no recibe un 200, y un reintento no crea un segundo pedido.

También se comprueba que el importe cobrado coincida con el preparado. Si no cuadra,
**no se crea el pedido** y queda registrado en el log: es mejor una llamada del equipo
que un documento con un importe que nadie sabe de dónde sale.

### Aviso técnico

Redsys deriva la clave de firma con **3DES**, que no existe en runtime edge. En Vercel
el preset por defecto despliega funciones Node, así que funciona tal cual. Lo que **no**
se puede hacer es cambiar el proyecto al preset `vercel-edge` sin sacar antes las rutas
de `/api/pago/`.

---

## 7. Decisiones vuestras que están puestas por defecto

| Ajuste | Ahora | Qué pasa si lo cambias |
|---|---|---|
| `NUXT_APROBAR_PEDIDOS` | `false` | A `true`, los pedidos nacen aprobados y con número `PED-MAT-26-NN` en vez de en borrador. Se deja en borrador porque el formulario es público y la numeración consumida no se recupera |
| `NUXT_CATALOGO_SIN_FILTRO` | `false` | A `true` se salta el filtro `b2b`/`b2c`. Sólo para probar |
| Límite de pedidos | 5 cada 5 min por IP | En `server/api/pedidos.post.ts` |
| IVA | ninguno | Ni el catálogo ni vuestros pedidos históricos aplican impuestos. Si eso cambia, hay que mandar `taxes` explícitos en cada línea |

---

## 8. Protección de datos

En el checkout hay una casilla que enlaza vuestra política de privacidad, **marcada por
defecto** por decisión del equipo.

Un apunte para que lo sepáis, no para discutirlo: una casilla premarcada **no es
consentimiento válido** según el RGPD (hace falta un acto afirmativo). La buena noticia
es que para tramitar un pedido no hace falta consentimiento: la base legal es la
**ejecución de un contrato**, y lo que exige la ley entonces es *informar*, que es
justo lo que hace el enlace. Así que el montaje actual es defendible.

Donde sí conviene tener cuidado es si algún día se añade un "quiero recibir novedades":
**eso sí sería consentimiento y no puede ir premarcado.**

---

## 9. Lo que sigue sin estar hecho

- **Favicon, `robots.txt` y sitemap.**
- **Tests automáticos.** La verificación ha sido manual contra la API real.
- **Página de error 404 propia.**
- **Botón de pagar con tarjeta en el checkout.** Los endpoints y las páginas de vuelta
  están hechos, pero el checkout todavía sólo ofrece transferencia y Bizum. Añadir la
  opción es enviar el formulario a `/api/pago/iniciar` y autoenviar por POST lo que
  devuelve. Se deja sin activar a propósito hasta que existan las credenciales del
  banco: un botón de pagar que no funciona es peor que no tenerlo.
- **Cron de resync** (punto 5).
