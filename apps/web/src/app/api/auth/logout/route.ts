import { NextRequest, NextResponse } from 'next/server'
import { invalidateTokenCache } from '@/lib/api-auth'

/**
 * POST /api/auth/logout
 * Invalida el cache de tokens para forzar revalidación
 * No requiere autenticación (el cliente ya eliminó su token)
 */
export async function POST(req: NextRequest) {
  try {
    // Intentar obtener el token del header para invalidación específica
    const authorization = req.headers.get('authorization')
    let token: string | undefined

    if (authorization && authorization.startsWith('Bearer ')) {
      token = authorization.substring(7)
    }

    // Invalidar token específico o todo el cache
    invalidateTokenCache(token)

    return NextResponse.json({
      success: true,
      message: 'Sesión cerrada correctamente'
    })
  } catch (error) {
    console.error('Error in logout:', error)
    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    )
  }
}
