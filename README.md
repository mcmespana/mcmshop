# mcmshop

Catálogo de productos de Holded a modo de tienda online para pedidos "b2b y b2c" (en cristiano: vender cositas a las delegaciones locales del MCM y/o a personitas normales)

Holded es la única fuente de verdad: catálogo, stock, contactos y pedidos. El portal no
tiene base de datos propia y el panel de administración es el propio Holded.

## Documentación

| Documento | Qué contiene |
|---|---|
| [`PUESTA_EN_MARCHA.md`](./PUESTA_EN_MARCHA.md) | **Empieza por aquí.** Qué hay que configurar en Holded, Google, Resend, Vercel y Redsys |
| [`HALLAZGOS.md`](./HALLAZGOS.md) | Cómo se comporta de verdad la API de Holded, comprobado contra datos reales |
| [`PRIMEROS_PASOS.md`](./PRIMEROS_PASOS.md) | Brief original del proyecto |

## Desarrollo

```bash
npm install
cp .env.example .env    # y rellena al menos NUXT_HOLDED_API_KEY y NUXT_SESSION_SECRET
npm run dev
```

Para ver el catálogo antes de haber etiquetado nada en Holded,
`NUXT_CATALOGO_SIN_FILTRO=true`.

```bash
npm run build        # build de producción
npx nuxi typecheck   # comprobación de tipos
```
