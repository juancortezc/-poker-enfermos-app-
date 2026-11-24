/**
 * Utility functions for player-related operations
 */

// URL de la imagen del pato para invitados
export const GUEST_PHOTO_URL = 'https://storage.googleapis.com/poker-enfermos/pato.png'

/**
 * Returns the appropriate photo URL for a player.
 * Guests (Invitados) always get the duck (pato) image.
 *
 * @param photoUrl - The player's photo URL (may be undefined)
 * @param role - The player's role (Comision, Enfermo, Invitado)
 * @returns The photo URL to use, or undefined if no photo
 */
export function getPlayerPhotoUrl(
  photoUrl: string | null | undefined,
  role: string | null | undefined
): string | undefined {
  // Guests always get the duck photo
  if (role === 'Invitado') {
    return GUEST_PHOTO_URL
  }

  return photoUrl || undefined
}

/**
 * Checks if a player is a guest (Invitado)
 */
export function isGuest(role: string | null | undefined): boolean {
  return role === 'Invitado'
}

/**
 * Builds the display name of a player.
 *
 * Guests (Invitados) are frequently registered with an incomplete reference name
 * ("Sobrino Diego", "Carlos jr") and no last name, so the parts are joined
 * defensively to avoid trailing whitespace.
 */
export function getPlayerFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string {
  return [firstName, lastName]
    .map(part => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ')
}
