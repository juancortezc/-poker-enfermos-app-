/**
 * Invitados externos (rol Invitado) del lado del servidor: alta rapida desde
 * el selector de la fecha y "ultima vez que jugo" para ordenar el selector.
 * Recibe la base por parametro para poder probarse sin Prisma real.
 */
import type { PrismaClient } from '@prisma/client'
import { AppError } from '@/lib/errors'
import { getEcuadorToday } from '@/lib/date-utils'
import { GUEST_PHOTO_URL, fullName, guestNameKey, type CreateGuestInput } from '@poker/shared'

export type GuestDb = {
  player: Pick<PrismaClient['player'], 'findFirst' | 'findMany' | 'create'>
}
export type GameDateDb = {
  gameDate: Pick<PrismaClient['gameDate'], 'findMany'>
}

/** Lo que el selector necesita de cada invitado (sin pin ni adminKey). */
export const GUEST_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
  photoUrl: true,
  inviter: { select: { id: true, firstName: true, lastName: true } },
} as const

/**
 * Crea un invitado con nombre real. Exige que quien invita sea un Enfermo o
 * Comision activo y rechaza con 409 `DUPLICATE_GUEST` si ya hay un invitado
 * activo con el mismo nombre y apellido (sin importar tildes ni mayusculas):
 * `details.existingGuest` trae ese invitado para elegirlo en su lugar.
 */
export async function createGuest(db: GuestDb, input: CreateGuestInput) {
  const inviter = await db.player.findFirst({
    where: { id: input.inviterId, isActive: true, role: { in: ['Enfermo', 'Comision'] } },
    select: { id: true },
  })
  if (!inviter) {
    throw AppError.validation(
      [{ field: 'inviterId', message: 'Quien invita debe ser un Enfermo o Comisión activo' }],
      'Quien invita debe ser un Enfermo o Comisión activo'
    )
  }

  const key = guestNameKey(input.firstName, input.lastName)
  const activeGuests = await db.player.findMany({
    where: { role: 'Invitado', isActive: true },
    select: GUEST_SELECT,
  })
  const existing = activeGuests.find((g) => guestNameKey(g.firstName, g.lastName) === key)
  if (existing) {
    const by = existing.inviter ? ` (invitado por ${fullName(existing.inviter)})` : ''
    throw AppError.conflict(
      `Ya existe el invitado ${fullName(existing)}${by}. Elígelo de la lista en vez de crearlo otra vez.`,
      'DUPLICATE_GUEST',
      { existingGuest: existing }
    )
  }

  const year = getEcuadorToday().year
  const guest = await db.player.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      role: 'Invitado',
      inviterId: input.inviterId,
      photoUrl: GUEST_PHOTO_URL,
      aliases: [],
      joinDate: String(year),
      joinYear: year,
      isActive: true,
    },
    select: GUEST_SELECT,
  })
  return { ...guest, lastPlayedAt: null as string | null }
}

/**
 * Agrega a cada invitado el dia de su ultima fecha (configurada, en curso o
 * jugada), para ordenar el selector por participacion reciente.
 */
export async function withLastPlayed<T extends { id: string }>(
  db: GameDateDb,
  guests: T[]
): Promise<(T & { lastPlayedAt: string | null })[]> {
  if (guests.length === 0) return []
  const dates = await db.gameDate.findMany({
    where: {
      playerIds: { hasSome: guests.map((g) => g.id) },
      status: { in: ['CREATED', 'in_progress', 'completed'] },
    },
    select: { playerIds: true, scheduledDate: true },
    orderBy: { scheduledDate: 'desc' },
  })
  const last = new Map<string, string>()
  for (const d of dates) {
    for (const id of d.playerIds) {
      if (!last.has(id)) last.set(id, d.scheduledDate.toISOString())
    }
  }
  return guests.map((g) => ({ ...g, lastPlayedAt: last.get(g.id) ?? null }))
}
