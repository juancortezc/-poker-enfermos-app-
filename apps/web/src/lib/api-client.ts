/**
 * Lectura de respuestas de la API en el navegador.
 *
 * La API responde `{ success: true, data }` y, en error,
 * `{ success: false, error: { code, message, errors?, details?, errorId } }`.
 * Mientras convivan versiones (una API vieja con `{ error: "texto" }` y el
 * body a secas), todo cliente pasa por aqui y acepta los dos formatos:
 *
 * - `unwrapApiBody(body)`: `{ success: true, data }` -> `data`; lo demas, tal cual.
 * - `readApiJson(res)`: el body ya desenvuelto si `res.ok`; si no, el error
 *   aplanado al formato viejo (`{ error: "mensaje", code, errorId, ... }`),
 *   asi `data.error` sigue siendo un texto y nunca sale "[object Object]".
 * - `parseApiResponse(res)` / `apiFetch(url)`: igual, pero lanzan `ApiError`.
 */
import { buildAuthHeaders } from '@/lib/client-auth'

export interface ApiErrorDetail {
  field: string
  message: string
  code?: string
}

/** Error de la API ya aplanado: `error` es siempre texto. */
export interface LegacyApiError {
  error: string
  message?: string
  code?: string
  errorId?: string
  errors?: ApiErrorDetail[]
  [extra: string]: unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** `{ success: true, data }` -> `data`. Cualquier otro body se devuelve tal cual. */
export function unwrapApiBody<T = unknown>(body: unknown): T {
  if (isObject(body) && body.success === true && 'data' in body) return body.data as T
  return body as T
}

/**
 * Aplana un body de error (nuevo o viejo) a `{ error: string, code?, ... }`.
 * Los `details` del formato nuevo (p. ej. `hint`) quedan en la raiz, como
 * estaban antes.
 */
export function normalizeApiError(body: unknown, status?: number): LegacyApiError {
  const fallback = status ? `Error ${status}` : 'Error inesperado'
  if (!isObject(body)) return { error: typeof body === 'string' && body ? body : fallback }

  const err = body.error
  if (isObject(err)) {
    const details = isObject(err.details) ? err.details : {}
    const message = typeof err.message === 'string' && err.message ? err.message : fallback
    return {
      ...details,
      error: message,
      message,
      code: typeof err.code === 'string' ? err.code : undefined,
      errorId: typeof err.errorId === 'string' ? err.errorId : undefined,
      errors: Array.isArray(err.errors) ? (err.errors as ApiErrorDetail[]) : undefined,
    }
  }

  const message =
    typeof err === 'string' && err
      ? err
      : typeof body.message === 'string' && body.message
        ? body.message
        : fallback
  return { ...body, error: message }
}

/** Mensaje para mostrar a partir de un body de error en cualquier formato. */
export function apiErrorMessage(body: unknown, fallback = 'Error inesperado'): string {
  if (body instanceof ApiError) return body.message || fallback
  const normalized = normalizeApiError(body)
  return normalized.error && !/^Error (\d+|inesperado)$/.test(normalized.error) ? normalized.error : fallback
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly errorId?: string
  readonly errors?: ApiErrorDetail[]
  /** El error aplanado (incluye los datos extra como `hint`). */
  readonly body: LegacyApiError
  /** Texto crudo de la respuesta (compatibilidad con el fetcher de SWR). */
  readonly info: string

  constructor(status: number, body: LegacyApiError, info = '') {
    super(body.error || `HTTP Error: ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.errorId = body.errorId
    this.errors = body.errors
    this.body = body
    this.info = info
  }
}

async function readText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

function parseText(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * Reemplazo de `await res.json()`: con `res.ok`, el body desenvuelto; si no,
 * el error aplanado (`data.error` es texto). No lanza por status.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readApiJson<T = any>(res: Response): Promise<T> {
  const text = await readText(res)
  if (!res.ok) return normalizeApiError(parseText(text), res.status) as T
  return unwrapApiBody<T>(text ? JSON.parse(text) : null)
}

/** Body desenvuelto si `res.ok`; si no, lanza `ApiError`. */
export async function parseApiResponse<T = unknown>(res: Response): Promise<T> {
  const text = await readText(res)
  if (!res.ok) throw new ApiError(res.status, normalizeApiError(parseText(text), res.status), text)
  return unwrapApiBody<T>(text ? JSON.parse(text) : null)
}

/**
 * fetch con la credencial guardada (y Content-Type JSON si hay body).
 * Devuelve el body desenvuelto o lanza `ApiError`.
 */
export async function apiFetch<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = buildAuthHeaders(init.headers, { includeJson: init.body !== undefined && !(init.body instanceof FormData) })
  const res = await fetch(url, { ...init, headers })
  return parseApiResponse<T>(res)
}
