import { defineNuxtModule, addTemplate } from '@nuxt/kit'

interface PageResource {
  metadata: { name: string }
  spec?: {
    key?: string
    title?: string
    description?: string
    content?: string | unknown[]
    parentRef?: { name: string } | null
    publish?: { fromDate?: string; toDate?: string }
  }
}

async function fetchPages(apiBaseUrl: string): Promise<PageResource[]> {
  if (!apiBaseUrl) {
    console.warn('[pages-data] No apiBaseUrl configured')
    return []
  }

  try {
    const response = await fetch(`${apiBaseUrl}/pages`)
    if (!response.ok) {
      console.error(`[pages-data] Failed to fetch pages: ${response.status}`)
      return []
    }
    return await response.json()
  } catch (error: unknown) {
    console.error('[pages-data] Failed to fetch pages:', String(error))
    return []
  }
}

export default defineNuxtModule({
  meta: {
    name: 'pages-data',
    configKey: 'pagesData',
  },
  async setup(_options, nuxt) {
    const apiBaseUrl = (nuxt.options.runtimeConfig?.public?.apiBaseUrl as string) || ''

    const pages = await fetchPages(apiBaseUrl)

    addTemplate({
      filename: 'pages-data.json',
      write: true,
      getContents: () => JSON.stringify(pages, null, 2),
    })

    addTemplate({
      filename: 'pages-data.ts',
      write: true,
      getContents: () => `
export interface PageResource {
  metadata: { name: string }
  spec?: {
    key?: string
    title?: string
    description?: string
    content?: string | unknown[]
    parentRef?: { name: string } | null
    publish?: { fromDate?: string; toDate?: string }
  }
}

import pagesJson from './pages-data.json'

export const pages: PageResource[] = pagesJson as PageResource[]

export function getHomePage(): PageResource | null {
  return pages.find((p) => p.spec?.key === '__home__' && !p.spec?.parentRef?.name) || null
}

export function getPageByKey(key: string): PageResource | null {
  return pages.find((p) => p.spec?.key === key && p.spec?.parentRef?.name)
    || pages.find((p) => p.spec?.key === key)
    || null
}

export function getAllRoutes(): string[] {
  const routes: string[] = ['/']
  const pageMap = new Map<string, PageResource>()
  pages.forEach((p) => pageMap.set(p.metadata.name, p))

  function getFullPath(page: PageResource): string {
    const key = page.spec?.key || page.metadata.name
    if (key === '__home__') return '/'
    const parentName = page.spec?.parentRef?.name
    if (parentName && pageMap.has(parentName)) {
      const parentPath = getFullPath(pageMap.get(parentName)!)
      if (parentPath === '/') return '/' + key
      return parentPath + '/' + key
    }
    return '/' + key
  }

  pages.forEach((page) => {
    const path = getFullPath(page)
    if (path !== '/' && !routes.includes(path)) {
      routes.push(path)
    }
  })

  return routes
}
`,
    })

    nuxt.hook('nitro:config', (nitroConfig) => {
      const routes = pages
        .map((page) => {
          const key = page.spec?.key || page.metadata.name
          if (key === '__home__') return '/'
          return `/${key}`
        })
        .filter((r, i, arr) => arr.indexOf(r) === i)

      nitroConfig.prerender = nitroConfig.prerender || {}
      nitroConfig.prerender.routes = [...(nitroConfig.prerender.routes || []), ...routes]
    })
  },
})
