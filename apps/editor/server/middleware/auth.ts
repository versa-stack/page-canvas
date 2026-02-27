import { createError, defineEventHandler, getHeader } from 'h3'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const HYDRA_JWKS_URL = process.env.ORY_HYDRA_JWKS_URL || 'http://ory-hydra-public.ory.svc.cluster.local/.well-known/jwks.json'
const HYDRA_ISSUER = process.env.ORY_HYDRA_ISSUER || 'https://hydra.versa-stack.localdev'

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(HYDRA_JWKS_URL))
  }
  return jwks
}

export interface AuthUser {
  sub: string
  email?: string
}

export default defineEventHandler(async (event) => {
  const path = event.path || ''

  if (!path.startsWith('/api/')) {
    return
  }

  if (event.method === 'OPTIONS') {
    return
  }

  const authorization = getHeader(event, 'authorization')
  if (!authorization?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Missing or invalid Authorization header',
    })
  }

  const token = authorization.substring(7)

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: HYDRA_ISSUER,
    })

    event.context.auth = {
      sub: payload.sub,
      email: (payload as Record<string, unknown>).email as string | undefined,
    } satisfies AuthUser
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid or expired JWT token',
    })
  }
})
