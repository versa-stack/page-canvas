import { getSourceProvider } from '~/server/providers'

export default defineEventHandler(async () => {
  const provider = getSourceProvider()
  return await provider.listPages()
})
