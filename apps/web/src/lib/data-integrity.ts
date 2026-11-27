/**
 * Guardas de integridad que dependen de la base (lo puro está en
 * @poker/shared). Reciben el cliente Prisma (o el `tx` de una transacción)
 * para poder probarlas sin base y usarlas dentro de un $transaction.
 */
import type { Prisma } from '@prisma/client'
import { openDatesMessage, openGameDateNumbers } from '@poker/shared'
import { AppError } from '@/lib/errors'

type Db = Prisma.TransactionClient

/**
 * Todos los ids existen como jugador. Si alguno no: 422 VALIDATION_ERROR con
 * un `errors[]` por id, igual que un fallo del esquema Zod.
 */
export async function assertPlayersExist(
  db: Pick<Db, 'player'>,
  ids: readonly string[],
  field = 'playerIds'
): Promise<void> {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return
  const found = await db.player.findMany({ where: { id: { in: unique } }, select: { id: true } })
  const known = new Set(found.map((p) => p.id))
  const missing = unique.filter((id) => !known.has(id))
  if (missing.length > 0) {
    throw AppError.validation(
      missing.map((id) => ({ field, message: `El jugador ${id} no existe`, code: 'PLAYER_NOT_FOUND' })),
      missing.length === 1 ? 'Hay un jugador que no existe' : `Hay ${missing.length} jugadores que no existen`
    )
  }
}

/**
 * Un torneo solo se finaliza con todas sus fechas completadas o canceladas:
 * una fecha CREATED o en curso que queda colgada bloquea crear las del
 * torneo siguiente. 409 TOURNAMENT_HAS_OPEN_DATES con los números.
 */
export async function assertCanFinalize(
  db: Pick<Db, 'gameDate'>,
  tournament: { id: number; number: number }
): Promise<void> {
  const dates = await db.gameDate.findMany({
    where: { tournamentId: tournament.id },
    select: { dateNumber: true, status: true },
  })
  const open = openGameDateNumbers(dates)
  if (open.length > 0) {
    throw AppError.conflict(openDatesMessage(tournament.number, open), 'TOURNAMENT_HAS_OPEN_DATES', {
      openDates: open,
    })
  }
}

/** Solo un torneo ACTIVO a la vez. 409 ACTIVE_TOURNAMENT_EXISTS. */
export async function assertNoOtherActiveTournament(
  db: Pick<Db, 'tournament'>,
  tournamentId: number
): Promise<void> {
  const other = await db.tournament.findFirst({
    where: { status: 'ACTIVO', id: { not: tournamentId } },
    select: { id: true, number: true },
  })
  if (other) {
    throw AppError.conflict(
      `Ya hay un torneo activo (Torneo ${other.number}). Finalízalo antes de activar otro.`,
      'ACTIVE_TOURNAMENT_EXISTS',
      { activeTournamentId: other.id }
    )
  }
}
