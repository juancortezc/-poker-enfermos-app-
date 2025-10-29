import { prisma } from './prisma'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  pin?: string
  photoUrl?: string
}

/**
 * Authenticate user by PIN (new system)
 * Replaces adminKey authentication with PIN-based auth for all users
 */
export async function authenticateUserByPin(pin: string): Promise<AuthUser | null> {
  try {
    // Validate PIN format (4 digits exactly)
    if (!/^\d{4}$/.test(pin)) {
      console.log('Invalid PIN format - must be 4 digits')
      return null
    }

    // Find all active users with PINs
    const players = await prisma.player.findMany({
      where: {
        isActive: true,
        pin: { not: null }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        pin: true,
        photoUrl: true,
      }
    })

    // Check each player's hashed PIN
    for (const player of players) {
      if (player.pin && await bcrypt.compare(pin, player.pin)) {
        return {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          role: player.role,
          pin: player.pin || undefined,
          photoUrl: player.photoUrl || undefined,
        }
      }
    }

    return null
  } catch (error) {
    console.error('PIN authentication error:', error)
    return null
  }
}

/**
 * Legacy adminKey authentication (mantener para rollback)
 * @deprecated Use authenticateUserByPin instead
 */
export async function authenticateUser(adminKey: string): Promise<AuthUser | null> {
  try {
    // Find all users with Comision role (they have adminKey)
    const players = await prisma.player.findMany({
      where: {
        role: UserRole.Comision,
        adminKey: { not: null }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        pin: true,
        photoUrl: true,
        adminKey: true,
      }
    })

    // Check each player's hashed admin key
    for (const player of players) {
      if (player.adminKey && await bcrypt.compare(adminKey, player.adminKey)) {
        return {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          role: player.role,
          pin: player.pin || undefined,
          photoUrl: player.photoUrl || undefined,
        }
      }
    }

    return null
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}