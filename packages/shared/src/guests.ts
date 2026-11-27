/**
 * Invitados externos (rol Invitado): reglas de nombre y orden del selector.
 *
 * Las estadisticas de los invitados no importan; lo que importa es que cada
 * uno quede registrado con su nombre real para no ensuciar las de los socios
 * (un "Sobrino X" que hoy es una persona y la proxima otra mezcla puntos,
 * eliminaciones y P&H de gente distinta).
 */

/** Minusculas, sin tildes y con un solo espacio entre palabras. */
export function normalizeGuestText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Clave para comparar dos invitados por nombre y apellido. */
export function guestNameKey(firstName: string, lastName?: string | null): string {
  return normalizeGuestText(`${firstName} ${lastName ?? ''}`)
}

/**
 * Palabras que delatan un nombre de referencia y no el real: "Invitado",
 * "Desconocido", "S/N", "Sobrino X", "Hermano de Juan", "Carlos jr"...
 * Se comparan contra cada palabra ya normalizada.
 */
const GENERIC_WORDS = new Set([
  'invitado', 'invitada', 'invitados', 'desconocido', 'desconocida', 'anonimo', 'anonima',
  'sn', 's/n', 's.n', 's.n.', 'nn', 'n/n', 'na', 'n/a', 'x', 'xx', 'xxx', 'jr', 'jr.',
  'sobrino', 'sobrina', 'hermano', 'hermana', 'primo', 'prima', 'amigo', 'amiga',
  'tio', 'tia', 'cunado', 'cunada', 'suegro', 'suegra', 'yerno', 'nuera', 'vecino', 'vecina',
])

/** Mensaje cuando el nombre parece de referencia. */
export const GUEST_GENERIC_NAME_MESSAGE =
  'Escribe el nombre y apellido reales del invitado (no "Invitado", "Desconocido", "S/N", "Sobrino X" ni similares)'

/** true si el texto (nombre o apellido) es un nombre de referencia y no el real. */
export function isGenericGuestName(value: string): boolean {
  const text = normalizeGuestText(value)
  if (!text) return true
  if (/\d/.test(text)) return true
  return text.split(' ').some((word) => GENERIC_WORDS.has(word))
}

/**
 * Comodines sin nombre que ya existen en la base ("Invitado 1", "Invitado 2
 * S/N"): se ofrecen al final del selector, solo si no hay otra opcion.
 */
export function isGuestPlaceholder(guest: { firstName: string; lastName?: string | null }): boolean {
  return /^invitado\s*\d+(\s*s\s*\/?\s*n)?$/.test(guestNameKey(guest.firstName, guest.lastName))
}

export interface SortableGuest {
  firstName: string
  lastName?: string | null
  /** Dia de su ultima fecha jugada (ISO) o null si nunca jugo. */
  lastPlayedAt?: string | null
}

/** Mas reciente primero; los que nunca jugaron al final, por nombre. */
export function compareGuestsByRecency(a: SortableGuest, b: SortableGuest): number {
  const ta = a.lastPlayedAt ? Date.parse(a.lastPlayedAt) : -Infinity
  const tb = b.lastPlayedAt ? Date.parse(b.lastPlayedAt) : -Infinity
  if (ta !== tb) return tb - ta
  return guestNameKey(a.firstName, a.lastName).localeCompare(guestNameKey(b.firstName, b.lastName), 'es')
}

/**
 * Reparte los invitados externos del selector: los que tienen nombre, por
 * participacion mas reciente, y aparte los comodines sin nombre.
 */
export function groupExternalGuests<T extends SortableGuest>(guests: readonly T[]): { named: T[]; placeholders: T[] } {
  const sorted = [...guests].sort(compareGuestsByRecency)
  return {
    named: sorted.filter((g) => !isGuestPlaceholder(g)),
    placeholders: sorted.filter((g) => isGuestPlaceholder(g)),
  }
}

/** "invitado por Juan Perez" (o undefined si no tiene quien lo invite). */
export function guestInviterLabel(guest: {
  inviter?: { firstName: string; lastName?: string | null } | null
}): string | undefined {
  if (!guest.inviter) return undefined
  const name = [guest.inviter.firstName, guest.inviter.lastName].filter(Boolean).join(' ').trim()
  return name ? `invitado por ${name}` : undefined
}
