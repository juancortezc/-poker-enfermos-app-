import { NextRequest } from 'next/server'
import { invalidateTokenCache } from '@/lib/api-auth'
import { withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'

/**
 * POST /api/auth/logout
 * Invalida el cache de tokens para forzar revalidación
 * No requiere autenticación (el cliente ya eliminó su token)
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  // Intentar obtener el token del header para invalidación específica
  const authorization = req.headers.get('authorization')
  let token: string | undefined

  if (authorization && authorization.startsWith('Bearer ')) {
    token = authorization.substring(7)
  }

  // Invalidar token específico o todo el cache
  invalidateTokenCache(token)

  return ok({
    message: 'Sesión cerrada correctamente'
  })
})
