import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { isValidPinForLogin, normalizePin } from './pin-utils'
import { AppError, errorResponse } from './errors'

export interface AuthenticatedUser {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  photoUrl?: string
}

// ============================================
// TOKEN CACHE - Optimización de Performance
// ============================================
// Cache de tokens en memoria con TTL para evitar N+1 queries bcrypt
// Reduce validación de 150-300ms a 1-5ms (99% mejora)
interface CachedUser {
  user: AuthenticatedUser
  /**
   * Hash de la credencial con la que se valido (pin o adminKey). Si en la
   * base ya no es el mismo, la clave se cambio y la entrada no sirve.
   */
  credentialHash: string
  expiry: number
}

/** Resultado de validar contra la base: el usuario y el hash que coincidio. */
interface ValidatedToken {
  user: AuthenticatedUser
  credentialHash: string
}

const tokenCache = new Map<string, CachedUser>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

// Cache para evitar actualizar lastActiveAt en cada request
// Solo actualiza si han pasado más de 5 minutos
const lastActivityUpdateCache = new Map<string, number>()
const ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000 // 5 minutos

/**
 * Actualiza lastActiveAt del usuario de forma asíncrona (fire-and-forget)
 * Solo actualiza si han pasado más de 5 minutos desde la última actualización
 */
function updateUserActivity(userId: string): void {
  const now = Date.now()
  const lastUpdate = lastActivityUpdateCache.get(userId) || 0

  if (now - lastUpdate < ACTIVITY_UPDATE_INTERVAL) {
    return // Aún no es tiempo de actualizar
  }

  // Marcar como actualizado inmediatamente para evitar duplicados
  lastActivityUpdateCache.set(userId, now)

  // Actualizar en background (no bloqueamos la respuesta)
  prisma.player.update({
    where: { id: userId },
    data: { lastActiveAt: new Date() },
    select: { id: true }
  }).catch(err => {
    console.error('Error updating lastActiveAt:', err)
  })
}

// Limpieza periódica del cache (cada 10 minutos)
const limpiezaCache = setInterval(() => {
  const now = Date.now()
  for (const [token, cached] of tokenCache.entries()) {
    if (now > cached.expiry) {
      tokenCache.delete(token)
    }
  }
}, 10 * 60 * 1000)
// Que el intervalo no mantenga vivo el proceso (pruebas, scripts).
limpiezaCache.unref?.()

/**
 * Invalida el cache completo de tokens
 * Útil al hacer logout o cambios en permisos
 */
export function invalidateTokenCache(token?: string) {
  if (token) {
    tokenCache.delete(token)
  } else {
    tokenCache.clear()
  }
}

/**
 * Borra del cache todas las entradas de un jugador. Llamarla al cambiar su
 * rol, su clave o su estado activo. Solo alcanza a esta instancia; las demas
 * lo detectan solas porque cada acierto del cache se revalida (ver
 * `freshFromCache`).
 */
export function invalidatePlayerTokens(playerId: string) {
  for (const [token, cached] of tokenCache.entries()) {
    if (cached.user.id === playerId) tokenCache.delete(token)
  }
}

/**
 * Un acierto del cache se confirma con una lectura por id (barata, sin
 * bcrypt): el jugador sigue activo y su credencial es la misma. El rol se
 * toma de la base, asi que un Comision degradado deja de serlo al instante
 * aunque su entrada siga en el cache de otra instancia.
 */
async function freshFromCache(cached: CachedUser, kind: 'PIN' | 'ADMIN'): Promise<AuthenticatedUser | null> {
  const player = await prisma.player.findUnique({
    where: { id: cached.user.id },
    select: { id: true, firstName: true, lastName: true, role: true, photoUrl: true, isActive: true, pin: true, adminKey: true },
  })
  if (!player || !player.isActive) return null
  const current = kind === 'PIN' ? player.pin : player.adminKey
  if (current !== cached.credentialHash) return null
  return {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    role: player.role,
    photoUrl: player.photoUrl || undefined,
  }
}

/**
 * Valida un token desde la base de datos (sin cache)
 * Usado internamente cuando el cache no tiene el token
 */
async function validateTokenFromDB(token: string): Promise<ValidatedToken | null> {
  // Verificar si es formato PIN:xxxx (nuevo sistema)
  if (token.startsWith('PIN:')) {
    const pin = token.substring(4) // Remover "PIN:"

    // Validar formato antes de tocar la base
    if (!isValidPinForLogin(pin)) {
      return null
    }

    // Buscar usuarios con PINs y verificar hash
    const users = await prisma.player.findMany({
      where: {
        pin: { not: null },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        pin: true,
        photoUrl: true
      }
    })

    // Verificar PIN hasheado
    for (const user of users) {
      if (user.pin && await bcrypt.compare(normalizePin(pin), user.pin)) {
        return {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            photoUrl: user.photoUrl || undefined
          },
          credentialHash: user.pin
        }
      }
    }

    return null
  }

  // Verificar si es formato ADMIN:xxxx (sistema legacy)
  if (token.startsWith('ADMIN:')) {
    const adminKey = token.substring(6) // Remover "ADMIN:"

    // Buscar usuarios con adminKey y verificar hash
    const users = await prisma.player.findMany({
      where: {
        adminKey: { not: null },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        adminKey: true,
        photoUrl: true
      }
    })

    // Verificar adminKey hasheado
    for (const user of users) {
      if (user.adminKey && await bcrypt.compare(adminKey, user.adminKey)) {
        return {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            photoUrl: user.photoUrl || undefined
          },
          credentialHash: user.adminKey
        }
      }
    }

    return null
  }

  // No legacy fallback needed - all keys should be properly prefixed
  return null
}

/**
 * Valida el acceso de API verificando el token de autorización
 * Usa cache en memoria para evitar queries bcrypt repetidas
 *
 * @param req - NextRequest con header Authorization
 * @returns Usuario autenticado o null si inválido
 */
export async function validateApiAccess(req: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Obtener token del header de autorización
    const authorization = req.headers.get('authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return null
    }

    const token = authorization.substring(7) // Remover "Bearer "

    if (!token) {
      return null
    }

    // 1. Cache (sin bcrypt), confirmado contra la base por id
    const cached = tokenCache.get(token)
    if (cached && Date.now() < cached.expiry) {
      const fresh = await freshFromCache(cached, token.startsWith('ADMIN:') ? 'ADMIN' : 'PIN')
      if (fresh) {
        cached.user = fresh
        return fresh
      }
      // Clave cambiada, jugador inactivo o borrado: se valida de cero.
      tokenCache.delete(token)
    }

    // 2. Cache miss - validate from DB (Slow path)
    const validated = await validateTokenFromDB(token)

    // 3. Store in cache if valid
    if (validated) {
      tokenCache.set(token, {
        user: validated.user,
        credentialHash: validated.credentialHash,
        expiry: Date.now() + CACHE_TTL
      })
    }

    return validated?.user ?? null
  } catch (error) {
    // OJO: aqui NO sabemos si la credencial es mala. Fallo la validacion —la
    // base no respondio, bcrypt reviento, el arranque en frio tardo— y eso no
    // es lo mismo que una clave invalida. Devolver null los juntaba en el
    // mismo 401, y el cliente cierra la sesion cuando ve un 401, asi que un
    // tropiezo pasajero del servidor expulsaba al usuario con el mensaje
    // "Tu clave cambio", que era mentira.
    console.error('Error validating API access:', error)
    throw new ValidacionNoDisponible()
  }
}

/**
 * La validacion no se pudo completar. No dice nada sobre la credencial.
 * Es un AppError 503 AUTH_UNAVAILABLE: si llega a `withErrorHandler` sale
 * como tal, y el cliente NO cierra la sesion (eso solo lo hace un 401).
 */
export class ValidacionNoDisponible extends AppError {
  constructor() {
    super('No se pudo validar tu sesion, reintenta', 503, 'AUTH_UNAVAILABLE')
    this.name = 'ValidacionNoDisponible'
    Object.setPrototypeOf(this, ValidacionNoDisponible.prototype)
  }
}

/**
 * Resuelve al usuario, o devuelve la respuesta de error que corresponda:
 * 401 cuando la credencial no sirve, 503 cuando no se pudo comprobar.
 */
async function resolverUsuario(
  req: NextRequest
): Promise<{ user: AuthenticatedUser } | { respuesta: Response }> {
  try {
    const user = await validateApiAccess(req)
    if (!user) return { respuesta: errorResponse(AppError.unauthorized('Acceso no autorizado'), req.url) }
    return { user }
  } catch (error) {
    if (error instanceof ValidacionNoDisponible) {
      return { respuesta: errorResponse(error, req.url) }
    }
    throw error
  }
}

export function canModifyPlayers(userRole: UserRole): boolean {
  return userRole === UserRole.Comision
}

// Helper para validar acceso a rutas protegidas
export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<Response>
): Promise<Response> {
  const r = await resolverUsuario(req)
  if ('respuesta' in r) return r.respuesta
  const user = r.user

  // Actualizar actividad del usuario (fire-and-forget)
  updateUserActivity(user.id)

  return handler(req, user)
}

/**
 * Variante que lanza en vez de devolver una respuesta, para usar dentro de
 * `withErrorHandler`: 401 sin credencial valida, 503 si no se pudo validar.
 */
export async function requireUser(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await validateApiAccess(req)
  if (!user) throw AppError.unauthorized('Acceso no autorizado')
  updateUserActivity(user.id)
  return user
}

/** Como `requireUser`, y ademas 403 si no es Comision. */
export async function requireComision(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireUser(req)
  if (!canModifyPlayers(user.role)) throw AppError.forbidden('Sin permisos suficientes')
  return user
}

// Helper para validar acceso a rutas que requieren permisos de Comision
export async function withComisionAuth(
  req: NextRequest,
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<Response>
): Promise<Response> {
  const r = await resolverUsuario(req)
  if ('respuesta' in r) return r.respuesta
  const user = r.user

  if (!canModifyPlayers(user.role)) {
    return errorResponse(AppError.forbidden('Sin permisos suficientes'), req.url)
  }

  // Actualizar actividad del usuario (fire-and-forget)
  updateUserActivity(user.id)

  return handler(req, user)
}