/**
 * Límite de intentos de login.
 *
 * Sin esto, el espacio de claves se agota por fuerza bruta: 10.000
 * combinaciones de 4 dígitos a unas pocas decenas de intentos por segundo son
 * minutos de trabajo. Con un tope de intentos por ventana, ese mismo ataque
 * pasa a tardar años.
 *
 * LIMITACIÓN CONOCIDA: el contador vive en memoria del proceso. En Vercel cada
 * instancia serverless tiene el suyo, así que alguien que fuerce el reparto
 * entre instancias obtiene más intentos de los que dice el tope. Aun así sube
 * el costo del ataque en varios órdenes de magnitud y no necesita ni tabla
 * nueva ni servicio externo. Si algún día hace falta el tope exacto, esto se
 * cambia por Vercel KV o una tabla en Postgres sin tocar a quien lo llama.
 */

const WINDOW_MS = 15 * 60 * 1000
/**
 * 20 y no 10 a propósito: la noche de juego los 20 socios entran desde el wifi
 * del local, o sea una sola IP para todos. Con un tope bajo se bloquearian
 * entre ellos por unos cuantos dedazos. Un login correcto limpia el contador,
 * asi que en uso legitimo practicamente nunca se llega al tope; un atacante,
 * que nunca acierta, si. Aun con 20, recorrer 10.000 claves toma ~125 horas.
 */
const MAX_ATTEMPTS = 20
const BLOCK_MS = 15 * 60 * 1000

interface Attempts {
  count: number
  firstAt: number
  blockedUntil?: number
}

const attempts = new Map<string, Attempts>()

// Limpieza periódica para que el Map no crezca sin límite
const CLEANUP_MS = 30 * 60 * 1000
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, a] of attempts.entries()) {
      const expired = now - a.firstAt > WINDOW_MS && (!a.blockedUntil || now > a.blockedUntil)
      if (expired) attempts.delete(key)
    }
  }, CLEANUP_MS)
  // No mantener vivo el proceso solo por este timer
  if (typeof timer === 'object' && timer && 'unref' in timer) {
    (timer as { unref: () => void }).unref()
  }
}

export interface ThrottleResult {
  allowed: boolean
  /** Segundos que faltan para poder reintentar. Solo si allowed es false. */
  retryAfterSeconds?: number
  /** Intentos que quedan en la ventana actual. */
  remaining: number
}

/** Identifica al que intenta. Nunca se registra la clave probada. */
export function throttleKey(ip: string | null): string {
  return ip || 'desconocido'
}

/** Consulta si se permite un intento más, sin registrarlo. */
export function checkLoginAttempt(key: string): ThrottleResult {
  const now = Date.now()
  const a = attempts.get(key)

  if (!a) return { allowed: true, remaining: MAX_ATTEMPTS }

  if (a.blockedUntil && now < a.blockedUntil) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((a.blockedUntil - now) / 1000),
      remaining: 0
    }
  }

  if (now - a.firstAt > WINDOW_MS) {
    attempts.delete(key)
    return { allowed: true, remaining: MAX_ATTEMPTS }
  }

  return { allowed: a.count < MAX_ATTEMPTS, remaining: Math.max(0, MAX_ATTEMPTS - a.count) }
}

/** Registra un intento fallido y bloquea si se pasó del tope. */
export function recordFailedLogin(key: string): ThrottleResult {
  const now = Date.now()
  const a = attempts.get(key)

  if (!a || now - a.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
  }

  a.count += 1
  if (a.count >= MAX_ATTEMPTS) {
    a.blockedUntil = now + BLOCK_MS
    return { allowed: false, retryAfterSeconds: Math.ceil(BLOCK_MS / 1000), remaining: 0 }
  }
  return { allowed: true, remaining: MAX_ATTEMPTS - a.count }
}

/** Un login correcto limpia el historial de ese origen. */
export function clearLoginAttempts(key: string): void {
  attempts.delete(key)
}
