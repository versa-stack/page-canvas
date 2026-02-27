import { createError, defineEventHandler } from 'h3'
import type { AuthUser } from './auth'

const KETO_READ_URL = process.env.ORY_KETO_READ_URL || 'http://ory-keto-read.ory.svc.cluster.local:4466'

interface KetoCheckRequest {
  namespace: string
  object: string
  relation: string
  subject_id: string
}

async function checkPermission(req: KetoCheckRequest): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      namespace: req.namespace,
      object: req.object,
      relation: req.relation,
      subject_id: req.subject_id,
    })
    const response = await fetch(`${KETO_READ_URL}/relation-tuples/check?${params}`)
    if (response.status === 200) {
      const body = await response.json()
      return body.allowed === true
    }
    return false
  } catch {
    return false
  }
}

function extractPageName(path: string): string | null {
  const match = path.match(/^\/api\/pages\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export default defineEventHandler(async (event) => {
  const path = event.path || ''

  if (!path.startsWith('/api/pages')) {
    return
  }

  if (event.method === 'OPTIONS' || event.method === 'GET') {
    return
  }

  const auth = event.context.auth as AuthUser | undefined
  if (!auth?.sub) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required',
    })
  }

  const pageName = extractPageName(path)
  if (!pageName) {
    return
  }

  const allowed = await checkPermission({
    namespace: 'pages',
    object: pageName,
    relation: 'access',
    subject_id: auth.sub,
  })

  if (!allowed) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions for this page',
    })
  }
})
