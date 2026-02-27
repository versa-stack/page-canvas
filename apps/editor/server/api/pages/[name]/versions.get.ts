import { getSourceProvider } from '~/server/providers'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Page name is required' })
  }
  const provider = getSourceProvider()
  return await provider.listVersions(name)
})
