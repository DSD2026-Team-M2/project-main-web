/**
 * authStore — lightweight JWT token + user storage.
 * Reads/writes from localStorage so the session persists across page refreshes.
 */

const TOKEN_KEY = 'm2:auth:token'
const USER_KEY  = 'm2:auth:user'

export type AuthUser = {
  id: number
  name: string
  email: string
  role: string
  status?: string
}

export const authStore = {
  getToken(): string | null {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },

  setToken(token: string): void {
    try { localStorage.setItem(TOKEN_KEY, token) } catch { /* quota */ }
  },

  clearToken(): void {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } catch { /* ignore */ }
  },

  getUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch { return null }
  },

  setUser(user: AuthUser): void {
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)) } catch { /* quota */ }
  },

  /** Returns an Authorization header object if a token is stored, otherwise {}. */
  getAuthHeaders(): Record<string, string> {
    const token = authStore.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
}
