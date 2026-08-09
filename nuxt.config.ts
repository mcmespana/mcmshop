import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/image'],

  css: ['~/assets/css/main.css'],

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
  },
})
