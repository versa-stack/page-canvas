import type { SourceProvider } from './types'
import { MongoDBSourceProvider } from './mongodb'
import { GitSourceProvider } from './git'

export type { SourceProvider, Page, PageVersion } from './types'

let _provider: SourceProvider | null = null

export function getSourceProvider(): SourceProvider {
  if (_provider) return _provider

  const providerType = process.env.PAGE_CANVAS_PROVIDER || 'mongodb'

  switch (providerType) {
    case 'mongodb':
      _provider = new MongoDBSourceProvider()
      break
    case 'git':
      _provider = new GitSourceProvider()
      break
    default:
      throw new Error(`Unsupported provider: '${providerType}'. Supported: mongodb, git`)
  }

  return _provider
}
