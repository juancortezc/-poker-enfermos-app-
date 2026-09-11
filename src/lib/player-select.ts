import { Prisma } from '@prisma/client'

/**
 * Qué campos de un jugador puede devolver la API.
 *
 * REGLA: nunca uses `include` al consultar `player`. Prisma devuelve TODOS los
 * campos escalares del modelo, y eso incluye `pin` y `adminKey` — los hashes de
 * las credenciales. Un PIN de 4 dígitos con bcrypt se rompe offline en minutos,
 * así que entregar el hash equivale a entregar la credencial.
 *
 * Usa siempre uno de los selectores de abajo. Ninguno incluye `pin` ni
 * `adminKey`, y no hay motivo para que la API los devuelva jamás.
 */

/** Lo que puede ver cualquiera: identidad para mostrar en tablas y podios. */
export const PLAYER_PUBLIC_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
  aliases: true,
  role: true,
  isActive: true
} satisfies Prisma.PlayerSelect

/**
 * Lo que puede ver un socio autenticado: lo anterior más los datos de
 * contacto del directorio. Es información del club, no pública.
 */
export const PLAYER_MEMBER_SELECT = {
  ...PLAYER_PUBLIC_SELECT,
  email: true,
  phone: true,
  birthDate: true,
  joinDate: true,
  joinYear: true,
  lastVictoryDate: true,
  isTemporary: true,
  inviterId: true
} satisfies Prisma.PlayerSelect

/** Lo que necesita la Comisión para administrar, sin credenciales. */
export const PLAYER_ADMIN_SELECT = {
  ...PLAYER_MEMBER_SELECT,
  lastActiveAt: true
} satisfies Prisma.PlayerSelect

/** Elige el selector según quién pregunta. */
export function playerSelectForRole(role?: string) {
  if (role === 'Comision') return PLAYER_ADMIN_SELECT
  if (role) return PLAYER_MEMBER_SELECT
  return PLAYER_PUBLIC_SELECT
}
