import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || '/api',
    },
  },

  modules: ['@pinia/nuxt'],
  pages: true,

  extends: [
    '@versa-stack/page-canvas-vcraft-base',
    '@versa-stack/page-canvas-vcraft-editor',
    '@versa-stack/page-canvas-page-management',
  ],

  vite: {
    resolve: {
      dedupe: ['vue', 'pinia', '@versa-stack/v-craft'],
    },
    plugins: [tailwindcss()],
  },

  pinia: {
    storesDirs: ['./app/stores/**'],
  },
})
