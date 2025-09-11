import { NextRequest, NextResponse } from 'next/server'
import { authenticateUserByPin, authenticateUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { adminKey, pin } = body

    // Nuevo sistema: autenticación por PIN
    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        return NextResponse.json(
          { error: 'PIN debe ser exactamente 4 dígitos' },
          { status: 400 }
        )
      }

      const user = await authenticateUserByPin(pin)

      if (!user) {
        return NextResponse.json(
          { error: 'PIN inválido' },
          { status: 401 }
        )
      }

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
        return NextResponse.json(
          { error: 'Invalid admin key' },
          { status: 401 }
        )
      }

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