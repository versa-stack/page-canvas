import tailwindcss from '@tailwindcss/vite'
import { extendNuxtConfig } from '@versa-stack/page-canvas-nuxt-site-config'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig(extendNuxtConfig(process.env.NUXT_UI_CONFIG_DIR || currentDir, {
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
}))
