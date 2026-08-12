import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/image'],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      /*
        El SVG lo usan los navegadores modernos y escala sin pixelarse; los PNG
        cubren al resto, y el .ico va para quien lo pide a pelo en la raíz sin
        mirar estas etiquetas. El de 180 es el que usa iOS al añadir a inicio.
      */
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
      meta: [
        // Color de la barra del navegador en móvil: el marino de la marca.
        { name: 'theme-color', content: '#13684b' },
      ],
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    // Privado: solo servidor.
    holdedApiKey: '',
    sessionSecret: '',
    googleClientId: '',
    googleClientSecret: '',
    // Secreto compartido que Holded no firma: se pasa en la URL del webhook.
    webhookSecret: '',
    // Almacén del que se lee el stock. Vacío = suma de todos.
    warehouseId: '',
    // Correo saliente.
    resendApiKey: '',
    correoRemitente: '',
    correoEquipo: '',
    /**
     * Aprobar el pedido nada más crearlo le asigna número de serie y lo deja como
     * los que hace el equipo a mano. Por defecto no, para que alguien revise
     * antes: el formulario es público y la numeración no se recupera.
     */
    aprobarPedidos: false,
    /**
     * Se salta el filtro por tag `b2b`/`b2c` y muestra todo el catálogo. Sólo para
     * probar antes de haber etiquetado nada en Holded: en producción va a false,
     * porque que un producto salga a la venta debe ser una decisión explícita.
     */
    catalogoSinFiltro: false,
    // Redsys (TPV de Banco Sabadell). Ver PUESTA_EN_MARCHA.md, punto 6.
    redsysComercio: '',
    redsysTerminal: '001',
    redsysClave: '',
    /** `pruebas` o `produccion`. Cada entorno tiene SU PROPIA clave de firma. */
    redsysEntorno: 'pruebas',
    public: {
      siteUrl: 'http://localhost:3000',
    },
  },

  image: {
    // Las fotos de producto viven en el bucket público de Holded.
    domains: ['storage.googleapis.com'],
  },

  routeRules: {
    // El catálogo se sirve pre-renderizado y se revalida por detrás.
    '/': { isr: 300 },
    '/api/catalogo': { isr: 300 },
    // Nada de cachear lo que depende de la sesión o muta datos.
    '/checkout': { isr: false },
    '/api/pedidos': { isr: false },
    /*
      Redsys deriva la clave de firma con 3DES (`node:crypto`), que no existe en
      runtime edge. En Vercel el preset por defecto ya despliega funciones Node,
      así que esto funciona tal cual; lo que NO se puede hacer es cambiar el
      proyecto al preset `vercel-edge` sin sacar antes estas rutas.
    */
    '/api/pago/**': { isr: false },
  },
})
