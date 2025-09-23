/**
 * Client-side helpers for retrieving stored credentials and building
 * Authorization headers. Keeps all localStorage access in one place.
 */

export type AuthCredential = {
  scheme: 'PIN' | 'ADMIN'
  value: string
}

const PIN_KEY = 'poker-pin'
const ADMIN_KEY = 'poker-adminkey'

/**
 * Reads whichever credential is currently stored. PIN takes priority
 * over the legacy admin key because that is the primary auth flow.
 */
export function getStoredAuthToken(): AuthCredential | null {
  if (typeof window === 'undefined') {
    return null
  }

  const pin = window.localStorage.getItem(PIN_KEY)
  if (pin) {
    return { scheme: 'PIN', value: pin }
  }

  const adminKey = window.localStorage.getItem(ADMIN_KEY)
  if (adminKey) {
    return { scheme: 'ADMIN', value: adminKey }
  }

  return null
}

/**
 * Returns the Authorization header value or null if there are no
 * credentials stored.
 */
export function getAuthHeaderValue(): string | null {
  const credential = getStoredAuthToken()
  if (!credential) {
    return null
  }

  return `Bearer ${credential.scheme}:${credential.value}`
}

/**
 * Convenience helper to merge authentication headers with optional
 * JSON headers. Returned value is a plain object suitable for fetch.
 */
export function buildAuthHeaders(
  base: HeadersInit = {},
  options: { includeJson?: boolean } = {}
): HeadersInit {
  const headers = new Headers(base)
  const authHeader = getAuthHeaderValue()

  if (authHeader) {
    headers.set('Authorization', authHeader)
  }

  if (options.includeJson) {
    headers.set('Content-Type', 'application/json')
  }

  return Object.fromEntries(headers.entries())
}

/**
 * Utility helpers for mutating stored credentials. Used by login/logout
 * flows to keep the storage format encapsulated here.
 */
export function storePin(pin: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PIN_KEY, pin)
}

export function storeAdminKey(key: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ADMIN_KEY, key)
}

export function clearStoredAuthTokens(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(PIN_KEY)
  window.localStorage.removeItem(ADMIN_KEY)
}

export function isAuthenticated(): boolean {
  return getAuthHeaderValue() !== null
}
