import type { NuxtConfig } from 'nuxt/config'
import * as fs from 'node:fs'
import * as jsyaml from 'js-yaml'
import { join } from 'node:path'

type NuxtExtendsType = string | [string, { auth: string }?]

type ModuleEntry = string | [string, Record<string, unknown>]

type SitePackage = {
  name: string
  version?: string
}

type SiteConfig = {
  name?: string
  hostname?: string
  runtimeConfig?: Record<string, unknown>
  css?: string[]
  packages?: SitePackage[]
  modules?: ModuleEntry[]
  nuxtExtends?: NuxtExtendsType[]
  devtools?: boolean
}

function loadConfig(dir: string): SiteConfig | null {
  try {
    const configPath = process.env.CONFIG_FILE
      ? process.env.CONFIG_FILE
      : join(dir, 'config.yaml')
    const yamlContent = fs.readFileSync(configPath, 'utf8')
    const processedYaml = yamlContent.replace(
      /process\.env\.(\w+)/g,
      (_match, envVar) => process.env[envVar] || _match,
    )
    return (jsyaml.load(processedYaml) as SiteConfig) || null
  } catch {
    return null
  }
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    const tVal = target[key]
    const sVal = source[key]
    if (Array.isArray(tVal) && Array.isArray(sVal)) {
      result[key] = [...tVal, ...sVal]
    } else if (
      tVal &&
      sVal &&
      typeof tVal === 'object' &&
      typeof sVal === 'object' &&
      !Array.isArray(tVal)
    ) {
      result[key] = deepMerge(
        tVal as Record<string, unknown>,
        sVal as Record<string, unknown>,
      )
    } else {
      result[key] = sVal
    }
  }
  return result
}

export function extendNuxtConfig(
  dir: string,
  config: NuxtConfig,
): NuxtConfig {
  const siteConfig = loadConfig(dir)
  if (!siteConfig) {
    return config
  }

  if (siteConfig.css) {
    config.css = [...(config.css || []), ...siteConfig.css]
  }

  if (siteConfig.nuxtExtends) {
    config.extends = [
      ...((config.extends as string[]) || []),
      ...(siteConfig.nuxtExtends as string[]),
    ]
  }

  if (siteConfig.modules) {
    config.modules = [...(config.modules || []), ...siteConfig.modules]
  }

  if (siteConfig.hostname) {
    if (!config.vite) config.vite = {}
    if (!config.vite.server) config.vite.server = {}
    config.vite.server.allowedHosts = [
      ...((config.vite.server.allowedHosts as string[]) || []),
      siteConfig.hostname,
    ]
  }

  if (siteConfig.runtimeConfig) {
    config.runtimeConfig = deepMerge(
      (config.runtimeConfig as Record<string, unknown>) || {},
      siteConfig.runtimeConfig,
    ) as NuxtConfig['runtimeConfig']
  }

  if (siteConfig.devtools !== undefined) {
    config.devtools = { enabled: siteConfig.devtools }
  }

  return config
}
