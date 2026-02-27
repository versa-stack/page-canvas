const KRATOS_PUBLIC_URL = import.meta.env.VITE_ORY_KRATOS_URL || 'https://kratos.versa-stack.localdev'

interface KratosSession {
  id: string
  active: boolean
  identity: {
    id: string
    traits: {
      email: string
      name?: { first?: string; last?: string }
    }
  }
}

export function useAuth() {
  const token = useState<string | null>('auth_token', () => null)
  const user = useState<KratosSession | null>('auth_user', () => null)

  async function checkSession(): Promise<boolean> {
    try {
      const response = await fetch(`${KRATOS_PUBLIC_URL}/sessions/whoami`, {
        credentials: 'include',
      })
      if (!response.ok) return false
      user.value = await response.json()
      return true
    } catch {
      return false
    }
  }

  function loginUrl(returnTo?: string): string {
    const params = new URLSearchParams()
    if (returnTo) params.set('return_to', returnTo)
    return `${KRATOS_PUBLIC_URL}/self-service/login/browser?${params}`
  }

  function registrationUrl(returnTo?: string): string {
    const params = new URLSearchParams()
    if (returnTo) params.set('return_to', returnTo)
    return `${KRATOS_PUBLIC_URL}/self-service/registration/browser?${params}`
  }

  function logoutUrl(): string {
    return `${KRATOS_PUBLIC_URL}/self-service/logout/browser`
  }

  async function logout(): Promise<void> {
    try {
      const response = await fetch(`${KRATOS_PUBLIC_URL}/self-service/logout/browser`, {
        credentials: 'include',
      })
      if (response.ok) {
        const body = await response.json()
        if (body.logout_url) {
          window.location.href = body.logout_url
          return
        }
      }
    } catch {
      // fallback
    }
    token.value = null
    user.value = null
  }

  return {
    token,
    user,
    checkSession,
    loginUrl,
    registrationUrl,
    logoutUrl,
    logout,
  }
}
