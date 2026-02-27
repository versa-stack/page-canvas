import { getSourceProvider } from '~/server/providers'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  const version = getRouterParam(event, 'version')
  if (!name || !version) {
    throw createError({ statusCode: 400, statusMessage: 'Page name and version are required' })
  }
  const provider = getSourceProvider()
  return await provider.restoreVersion(name, version)
})
