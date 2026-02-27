import { getSourceProvider } from '~/server/providers'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Page name is required' })
  }
  const provider = getSourceProvider()
  const page = await provider.getPage(name)
  if (!page) {
    throw createError({ statusCode: 404, statusMessage: `Page '${name}' not found` })
  }
  return page
})
