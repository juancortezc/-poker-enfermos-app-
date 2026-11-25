import { NextRequest } from 'next/server'
import { authenticateUserByPin, authenticateUser } from '@/lib/auth'
import { isValidPinForLogin, PIN_RULE_TEXT } from '@/lib/pin-utils'
import { checkLoginAttempt, recordFailedLogin, clearLoginAttempts, throttleKey } from '@/lib/login-throttle'
import { AppError, errorResponse, withErrorHandler } from '@/lib/errors'
import { ok, readJson } from '@/lib/http'
import { loginSchema } from '@poker/shared'

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await readJson(req)

  // El tope aplica al origen, no a la clave probada: así un atacante no gana
  // nada rotando claves, que es justo lo que hace la fuerza bruta.
  const key = throttleKey(
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip')
  )
  const gate = checkLoginAttempt(key)
  if (!gate.allowed) {
    const retryAfter = gate.retryAfterSeconds ?? 900
    const response = errorResponse(
      AppError.tooManyRequests(
        `Demasiados intentos. Probá de nuevo en ${Math.ceil((gate.retryAfterSeconds ?? 0) / 60)} minutos.`,
        'TOO_MANY_ATTEMPTS',
        { retryAfterSeconds: retryAfter }
      ),
      req.url
    )
    response.headers.set('Retry-After', String(retryAfter))
    return response
  }

  // Una forma invalida (pin que no es texto...) cuenta como intento fallido.
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    recordFailedLogin(key)
    throw parsed.error
  }
  const { adminKey, pin } = parsed.data

  // Nuevo sistema: autenticación por PIN
  if (pin) {
    if (!isValidPinForLogin(pin)) {
      recordFailedLogin(key)
      throw AppError.badRequest(`Clave inválida. ${PIN_RULE_TEXT}.`, 'INVALID_PIN')
    }

    const user = await authenticateUserByPin(pin)

    if (!user) {
      const after = recordFailedLogin(key)
      throw AppError.unauthorized(
        after.remaining > 0 && after.remaining <= 3
          ? `Clave incorrecta. Te ${after.remaining === 1 ? 'queda 1 intento' : `quedan ${after.remaining} intentos`}.`
          : 'Clave incorrecta',
        'INVALID_CREDENTIALS'
      )
    }

    clearLoginAttempts(key)
    return ok(user)
  }

  // Sistema legacy: adminKey (para rollback temporal)
  if (adminKey) {
    const user = await authenticateUser(adminKey)

    if (!user) {
      recordFailedLogin(key)
      throw AppError.unauthorized('Admin key inválida', 'INVALID_CREDENTIALS')
    }

    clearLoginAttempts(key)
    return ok(user)
  }

  // No se proporcionó ni PIN ni adminKey
  throw AppError.badRequest('PIN o admin key requerido', 'CREDENTIALS_REQUIRED')
})
