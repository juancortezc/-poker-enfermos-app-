const AVATAR_PALETTE = [
  '#D8A84E', // gold
  '#8E8E9B', // silver
  '#A5652E', // bronze
  '#6E6E78', // slate
  '#6FA3E0', // blue
  '#9B7FE0', // purple
]

/**
 * Color determinístico para el fondo de un avatar con iniciales, a partir
 * de un id de jugador (mismo id siempre da el mismo color).
 */
export function getAvatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

/**
 * Iniciales de un nombre completo (primera letra de las dos primeras
 * palabras), en mayúsculas.
 */
export function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase()
}
