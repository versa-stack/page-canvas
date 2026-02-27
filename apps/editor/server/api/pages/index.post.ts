import { getSourceProvider } from '~/server/providers'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const provider = getSourceProvider()
  return await provider.savePage(body)
})
