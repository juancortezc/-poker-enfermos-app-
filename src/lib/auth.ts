import { prisma } from './prisma'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  adminKey?: string
}

export async function authenticateUser(adminKey: string): Promise<AuthUser | null> {
  try {
    // Find all users with Comision role (they have adminKey)
    const players = await prisma.player.findMany({
      where: {
        role: UserRole.Comision,
        adminKey: { not: null }
      },
    })

    // Check each player's hashed admin key
    for (const player of players) {
      if (player.adminKey && await bcrypt.compare(adminKey, player.adminKey)) {
        return {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          role: player.role,
          adminKey: player.adminKey || undefined,
        }
      }
    }

    return null
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