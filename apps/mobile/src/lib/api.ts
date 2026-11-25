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

export interface ApiErrorDetail {
  field: string;
  message: string;
  code?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * La API responde `{ success: true, data }` (formato nuevo) o el body a secas
 * (formato viejo). Mientras convivan, se aceptan los dos: el nuevo se
 * desenvuelve y el viejo pasa tal cual.
 */
export function unwrapApiBody<T = unknown>(body: unknown): T {
  if (isObject(body) && body.success === true && 'data' in body) return body.data as T;
  return body as T;
}

/**
 * Error de la API. Lee los dos formatos de error:
 * - nuevo: `{ success: false, error: { code, message, errors?, details?, errorId } }`
 * - viejo: `{ error: "texto", code?, ...extras }`
 * `details` junta los datos extra (p. ej. `hint`) de cualquiera de los dos.
 */
export class ApiError extends Error {
  status: number;
  /** Texto crudo de la respuesta. */
  info: string;
  code?: string;
  errorId?: string;
  errors?: ApiErrorDetail[];
  details: Record<string, unknown>;

  constructor(status: number, info: string) {
    const parsed = ApiError.parse(info);
    super(parsed.message ?? `HTTP Error: ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.info = info;
    this.code = parsed.code;
    this.errorId = parsed.errorId;
    this.errors = parsed.errors;
    this.details = parsed.details;
  }

  private static parse(info: string): {
    message?: string;
    code?: string;
    errorId?: string;
    errors?: ApiErrorDetail[];
    details: Record<string, unknown>;
  } {
    let body: unknown;
    try {
      body = JSON.parse(info);
    } catch {
      return { details: {} }; // cuerpo no JSON
    }
    if (!isObject(body)) return { details: {} };
    const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

    const err = body.error;
    if (isObject(err)) {
      return {
        message: str(err.message),
        code: str(err.code),
        errorId: str(err.errorId),
        errors: Array.isArray(err.errors) ? (err.errors as ApiErrorDetail[]) : undefined,
        details: isObject(err.details) ? err.details : {},
      };
    }
    // Formato viejo: los extras (hint, stuckDates...) van en la raíz.
    const { error, code, message, ...rest } = body;
    return { message: str(error) ?? str(message), code: str(code), details: rest };
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
  return unwrapApiBody<T>(text ? JSON.parse(text) : undefined);
}

/** Fetcher de SWR: la key es la ruta de la API, p.ej. `/api/tournaments/active`. */
export const fetcher = <T = unknown>(path: string): Promise<T> => apiFetch<T>(path);
