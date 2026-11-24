/**
 * Cliente HTTP contra la API de la web (Next.js en Vercel).
 *
 * La credencial vive en memoria aquí para que cada request la lea sin tocar
 * SecureStore (que es asíncrono). AuthContext es el único que la escribe:
 * la carga al arrancar/desbloquear y la borra al cerrar sesión.
 *
 * Formato igual que src/lib/client-auth.ts de la web: `Bearer PIN:<clave>`.
 */

const DEFAULT_API_URL = 'https://poker-enfermos.vercel.app';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

let currentPin: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthPin(pin: string | null): void {
  currentPin = pin;
}

export function getAuthHeaderValue(): string | null {
  return currentPin ? `Bearer PIN:${currentPin}` : null;
}

export function isAuthenticated(): boolean {
  return currentPin !== null;
}

/**
 * Lo registra AuthContext. Se llama cuando la API responde 401 con una
 * credencial cargada: la clave ya no sirve (se cambió en otro dispositivo o la
 * cambió la Comisión). 403 es rol insuficiente y NO cierra sesión.
 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  status: number;
  info: string;

  constructor(status: number, info: string) {
    super(ApiError.messageFrom(status, info));
    this.name = 'ApiError';
    this.status = status;
    this.info = info;
  }

  /** La API responde `{ error: "..." }` en español; se usa tal cual si viene. */
  private static messageFrom(status: number, info: string): string {
    try {
      const parsed: unknown = JSON.parse(info);
      if (parsed && typeof parsed === 'object' && 'error' in parsed) {
        const msg = (parsed as { error: unknown }).error;
        if (typeof msg === 'string' && msg) return msg;
      }
    } catch {
      // cuerpo no JSON
    }
    return `HTTP Error: ${status}`;
  }
}

export type ApiRequestInit = Omit<RequestInit, 'body'> & {
  /** Se serializa como JSON y añade Content-Type. */
  json?: unknown;
  body?: RequestInit['body'];
  /** Para login/logout: no enviar la credencial guardada. */
  skipAuth?: boolean;
};

export function apiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export async function apiFetch<T = unknown>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { json, skipAuth, headers: baseHeaders, ...rest } = init;
  const headers = new Headers(baseHeaders);
  headers.set('Accept', 'application/json');

  const auth = skipAuth ? null : getAuthHeaderValue();
  if (auth && !headers.has('Authorization')) headers.set('Authorization', auth);

  let body = rest.body;
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  const response = await fetch(apiUrl(path), { ...rest, headers, body });

  if (!response.ok) {
    const info = await response.text().catch(() => '');
    // Solo si la clave que falló sigue siendo la cargada: un request viejo que
    // vuelve con 401 después de cerrar sesión y entrar con otra clave no
    // debe sacar al usuario nuevo.
    if (response.status === 401 && auth && auth === getAuthHeaderValue() && onUnauthorized) onUnauthorized();
    throw new ApiError(response.status, info);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Fetcher de SWR: la key es la ruta de la API, p.ej. `/api/tournaments/active`. */
export const fetcher = <T = unknown>(path: string): Promise<T> => apiFetch<T>(path);
