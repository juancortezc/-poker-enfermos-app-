import { NextRequest, NextResponse } from 'next/server'
import { authenticateUserByPin, authenticateUser } from '@/lib/auth'
import { isValidPinForLogin, PIN_RULE_TEXT } from '@/lib/pin-utils'
import { checkLoginAttempt, recordFailedLogin, clearLoginAttempts, throttleKey } from '@/lib/login-throttle'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { adminKey, pin } = body

    // El tope aplica al origen, no a la clave probada: así un atacante no gana
    // nada rotando claves, que es justo lo que hace la fuerza bruta.
    const key = throttleKey(
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip')
    )
    const gate = checkLoginAttempt(key)
    if (!gate.allowed) {
      return NextResponse.json(
        { error: `Demasiados intentos. Probá de nuevo en ${Math.ceil((gate.retryAfterSeconds ?? 0) / 60)} minutos.` },
        { status: 429, headers: { 'Retry-After': String(gate.retryAfterSeconds ?? 900) } }
      )
    }

    // Nuevo sistema: autenticación por PIN
    if (pin) {
      if (!isValidPinForLogin(pin)) {
        recordFailedLogin(key)
        return NextResponse.json(
          { error: `Clave inválida. ${PIN_RULE_TEXT}.` },
          { status: 400 }
        )
      }

      const user = await authenticateUserByPin(pin)

      if (!user) {
        const after = recordFailedLogin(key)
        return NextResponse.json(
          {
            error: after.remaining > 0 && after.remaining <= 3
              ? `Clave incorrecta. Te ${after.remaining === 1 ? 'queda 1 intento' : `quedan ${after.remaining} intentos`}.`
              : 'Clave incorrecta'
          },
          { status: 401 }
        )
      }

      clearLoginAttempts(key)
      return NextResponse.json(user)
    }

    // Sistema legacy: adminKey (para rollback temporal)
    if (adminKey) {
      if (!adminKey) {
        return NextResponse.json(
          { error: 'Admin key is required' },
          { status: 400 }
        )
      }

      const user = await authenticateUser(adminKey)

      if (!user) {
        recordFailedLogin(key)
        return NextResponse.json(
          { error: 'Invalid admin key' },
          { status: 401 }
        )
      }

      clearLoginAttempts(key)
      return NextResponse.json(user)
    }

    // No se proporcionó ni PIN ni adminKey
    return NextResponse.json(
      { error: 'PIN o admin key requerido' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}