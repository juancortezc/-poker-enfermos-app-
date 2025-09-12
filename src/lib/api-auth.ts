import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

export interface AuthenticatedUser {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  photoUrl?: string
}

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

    // Verificar si es formato PIN:xxxx (nuevo sistema)
    if (token.startsWith('PIN:')) {
      const pin = token.substring(4) // Remover "PIN:"
      
      // Validar formato del PIN (4 dígitos exactamente)
      if (!/^\d{4}$/.test(pin)) {
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
        if (user.pin && await bcrypt.compare(pin, user.pin)) {
          return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            photoUrl: user.photoUrl || undefined
          }
        }
      }

      return null
    }

    // Verificar si es formato ADMIN:xxxx (sistema legacy)
    if (token.startsWith('ADMIN:')) {
      const adminKey = token.substring(6) // Remover "ADMIN:"
      
      // Buscar usuario por admin_key (legacy)
      const user = await prisma.player.findFirst({
        where: {
          adminKey: adminKey,
          isActive: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          photoUrl: true
        }
      })

      return user
    }

    // Sistema legacy: adminKey directo (para compatibilidad)
    const user = await prisma.player.findFirst({
      where: {
        adminKey: token,
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        photoUrl: true
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