import { prisma } from './prisma'
import { UserRole } from '@prisma/client'

export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  adminKey?: string
}

export async function authenticateUser(adminKey: string): Promise<AuthUser | null> {
  try {
    const player = await prisma.player.findFirst({
      where: {
        adminKey: adminKey,
      },
    })

    if (!player) {
      return null
    }

    return {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      role: player.role,
      adminKey: player.adminKey || undefined,
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy = {
    [UserRole.Comision]: 3,
    [UserRole.Enfermo]: 2,
    [UserRole.Invitado]: 1,
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

export function canCRUD(userRole: UserRole): boolean {
  return userRole === UserRole.Comision
}