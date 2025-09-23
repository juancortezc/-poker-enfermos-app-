/**
 * Client-side authentication utilities
 * Handles token storage, headers, and auth state for frontend
 */

// Local storage keys
const AUTH_TOKEN_KEY = 'poker-auth-token'
const USER_DATA_KEY = 'poker-user-data'

export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  role: string
  pin?: string
  photoUrl?: string
}

/**
 * Get stored authentication token from localStorage
 */
export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

/**
 * Store authentication token in localStorage
 */
export function storeAuthToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

/**
 * Get stored user data from localStorage
 */
export function getStoredUserData(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const userData = localStorage.getItem(USER_DATA_KEY)
  return userData ? JSON.parse(userData) : null
}

/**
 * Store user data in localStorage
 */
export function storeUserData(user: AuthUser): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user))
}

/**
 * Clear all stored authentication data
 */
export function clearStoredAuthTokens(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(USER_DATA_KEY)
}

/**
 * Get authorization header value for API requests
 */
export function getAuthHeaderValue(): string | null {
  const token = getStoredAuthToken()
  return token ? `Bearer ${token}` : null
}

/**
 * Build headers object with authentication for fetch requests
 */
export function buildAuthHeaders(
  additionalHeaders: Record<string, string> = {},
  options: { includeJson?: boolean } = {}
): Record<string, string> {
  const headers: Record<string, string> = {
    ...additionalHeaders
  }

  // Add authorization header if token exists
  const authHeader = getAuthHeaderValue()
  if (authHeader) {
    headers['Authorization'] = authHeader
  }

  // Add content-type header if requested
  if (options.includeJson) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getStoredAuthToken() !== null
}

/**
 * Get current user role from stored data
 */
export function getCurrentUserRole(): string | null {
  const userData = getStoredUserData()
  return userData?.role || null
}