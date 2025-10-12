import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

/**
 * Hash a PIN using bcrypt
 */
export async function hashPin(pin: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(pin, saltRounds)
}

/**
 * Check if a PIN is unique among active players
 * @param pin - The plain text PIN to check
 * @param excludePlayerId - Optional player ID to exclude from the check (for updates)
 * @returns true if PIN is unique, false if already in use
 */
export async function isPinUnique(pin: string, excludePlayerId?: string): Promise<boolean> {
  // Get all active players with PINs
  const players = await prisma.player.findMany({
    where: {
      isActive: true,
      pin: { not: null },
      ...(excludePlayerId ? { id: { not: excludePlayerId } } : {})
    },
    select: {
      id: true,
      pin: true
    }
  })

  // Check if any player has this PIN (compare against hashed versions)
  for (const player of players) {
    if (player.pin) {
      const matches = await bcrypt.compare(pin, player.pin)
      if (matches) {
        return false // PIN already in use
      }
    }
  }

  return true // PIN is unique
}

/**
 * Validate and hash a PIN
 * @param pin - The plain text PIN
 * @param excludePlayerId - Optional player ID to exclude from uniqueness check
 * @returns Object with success status and either hashedPin or error message
 */
export async function validateAndHashPin(
  pin: string,
  excludePlayerId?: string
): Promise<{ success: true; hashedPin: string } | { success: false; error: string }> {
  // Validate format
  if (!/^\d{4}$/.test(pin)) {
    return { success: false, error: 'El PIN debe ser de 4 dígitos' }
  }

  // Check uniqueness
  const isUnique = await isPinUnique(pin, excludePlayerId)
  if (!isUnique) {
    return { success: false, error: 'Este PIN ya está en uso por otro jugador' }
  }

  // Hash the PIN
  const hashedPin = await hashPin(pin)
  return { success: true, hashedPin }
}
