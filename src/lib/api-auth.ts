import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { UserRole } from '@prisma/client'

export interface AuthenticatedUser {
  id: string
  firstName: string
  lastName: string
  role: UserRole
}

export async function validateApiAccess(req: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Obtener admin_key del header de autorización
    const authorization = req.headers.get('authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return null
    }

    const adminKey = authorization.substring(7) // Remover "Bearer "
    
    if (!adminKey) {
      return null
    }

    // Buscar usuario por admin_key
    const user = await prisma.player.findFirst({
      where: {
        adminKey: adminKey,
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true
      }
    })

    return user
  } catch (error) {
    console.error('Error validating API access:', error)
    return null
  }
}

export function canModifyPlayers(userRole: UserRole): boolean {
  return userRole === UserRole.Comision
}

export function createAuthResponse(message: string, status: number = 401) {
  return Response.json(
    { error: message },
    { 
      status,
      headers: {
        'Content-Type': 'application/json',
      }
    }
  )
}

// Helper para validar acceso a rutas protegidas
export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<Response>
): Promise<Response> {
  const user = await validateApiAccess(req)
  
  if (!user) {
    return createAuthResponse('Acceso no autorizado')
  }

  return handler(req, user)
}

// Helper para validar acceso a rutas que requieren permisos de Comision
export async function withComisionAuth(
  req: NextRequest,
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<Response>
): Promise<Response> {
  const user = await validateApiAccess(req)
  
  if (!user) {
    return createAuthResponse('Acceso no autorizado')
  }

  if (!canModifyPlayers(user.role)) {
    return createAuthResponse('Sin permisos suficientes', 403)
  }

  return handler(req, user)
}