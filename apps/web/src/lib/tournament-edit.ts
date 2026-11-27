/**
 * Editar jugadores y calendario de un torneo, con las reglas de
 * @poker/shared (tournament-edit.ts) aplicadas contra la base. Corre dentro
 * de un $transaction: si algo falla no queda nada a medias.
 */
import type { Prisma } from '@prisma/client'
import {
  EDITABLE_GAME_DATE_STATUSES,
  calendarFromPatch,
  checkTournamentRosterEditable,
  fullName,
  parseToUTCNoon,
  planCalendarEdit,
  planParticipantsEdit,
  playedDatesByPlayer,
  type CalendarInput,
  type EditIssue,
  type EditResult,
} from '@poker/shared'
import { AppError } from '@/lib/errors'

type Tx = Prisma.TransactionClient

export interface RosterEditInput {
  calendar?: CalendarInput[]
  /** Formato viejo de PUT: solo cambios de día por id. */
  gameDatesPatch?: Array<{ id: number; scheduledDate: string }>
  participantIds?: string[]
}

export function issueToError(issue: EditIssue): AppError {
  return issue.kind === 'conflict'
    ? AppError.conflict(issue.message, issue.code, issue.details)
    : AppError.badRequest(issue.message, issue.code, issue.details)
}

function unwrap<T>(result: EditResult<T>): T {
  if (!result.ok) throw issueToError(result.error)
  return result.value
}

const editable = [...EDITABLE_GAME_DATE_STATUSES]
const STALE = 'Una fecha cambió de estado mientras editabas. Recarga e intenta de nuevo.'

/** Quién jugó qué fecha del torneo: fechas en curso/completadas y eliminaciones. */
export async function loadPlayedDates(tx: Tx, tournamentId: number) {
  const [dates, eliminations] = await Promise.all([
    tx.gameDate.findMany({
      where: { tournamentId },
      select: { dateNumber: true, status: true, playerIds: true },
    }),
    tx.elimination.findMany({
      where: { gameDate: { tournamentId } },
      select: { eliminatedPlayerId: true, eliminatorPlayerId: true, gameDate: { select: { dateNumber: true } } },
    }),
  ])
  return playedDatesByPlayer(
    dates,
    eliminations.map((e) => ({ dateNumber: e.gameDate.dateNumber, playerIds: [e.eliminatedPlayerId, e.eliminatorPlayerId] }))
  )
}

/**
 * Valida y aplica el cambio de inscritos (lista completa). Mantiene
 * TournamentParticipant y Tournament.participantIds iguales.
 */
export async function applyParticipantsEdit(
  tx: Tx,
  tournament: { id: number; number: number; status: string },
  next: string[]
) {
  unwrap(checkTournamentRosterEditable(tournament))
  const current = (
    await tx.tournamentParticipant.findMany({ where: { tournamentId: tournament.id }, select: { playerId: true } })
  ).map((p) => p.playerId)
  const touched = [...new Set([...next, ...current])]
  const [players, played] = await Promise.all([
    tx.player.findMany({
      where: { id: { in: touched } },
      select: { id: true, firstName: true, lastName: true, role: true, isActive: true },
    }),
    loadPlayedDates(tx, tournament.id),
  ])
  const plan = unwrap(
    planParticipantsEdit({
      current,
      next,
      played,
      players: players.map((p) => ({ id: p.id, name: fullName(p), role: p.role, isActive: p.isActive })),
    })
  )

  if (plan.remove.length > 0) {
    await tx.tournamentParticipant.deleteMany({ where: { tournamentId: tournament.id, playerId: { in: plan.remove } } })
  }
  if (plan.add.length > 0) {
    await tx.tournamentParticipant.createMany({
      data: plan.add.map((playerId) => ({ tournamentId: tournament.id, playerId, confirmed: false })),
      skipDuplicates: true,
    })
  }
  await tx.tournament.update({ where: { id: tournament.id }, data: { participantIds: plan.participantIds } })
  return plan
}

/** Valida y aplica el calendario completo pedido. */
export async function applyCalendarEdit(
  tx: Tx,
  tournament: { id: number; number: number; status: string },
  input: Pick<RosterEditInput, 'calendar' | 'gameDatesPatch'>
) {
  unwrap(checkTournamentRosterEditable(tournament))
  const current = await tx.gameDate.findMany({
    where: { tournamentId: tournament.id },
    select: { id: true, dateNumber: true, scheduledDate: true, status: true },
    orderBy: { dateNumber: 'asc' },
  })
  const calendar = input.calendar ?? unwrap(calendarFromPatch(current, input.gameDatesPatch ?? []))
  const plan = unwrap(planCalendarEdit(current, calendar))

  // Cada escritura exige que la fecha siga sin empezar: si alguien la inició
  // entre la lectura y aquí, se aborta todo.
  if (plan.removes.length > 0) {
    const { count } = await tx.gameDate.deleteMany({
      where: { id: { in: plan.removes }, tournamentId: tournament.id, status: { in: editable } },
    })
    if (count !== plan.removes.length) throw AppError.conflict(STALE, 'GAME_DATE_NOT_EDITABLE')
  }
  for (const u of plan.updates) {
    const { count } = await tx.gameDate.updateMany({
      where: { id: u.id, tournamentId: tournament.id, status: { in: editable } },
      data: { dateNumber: u.dateNumber, scheduledDate: parseToUTCNoon(u.scheduledDate) },
    })
    if (count !== 1) throw AppError.conflict(STALE, 'GAME_DATE_NOT_EDITABLE')
  }
  if (plan.creates.length > 0) {
    await tx.gameDate.createMany({
      data: plan.creates.map((c) => ({
        tournamentId: tournament.id,
        dateNumber: c.dateNumber,
        scheduledDate: parseToUTCNoon(c.scheduledDate),
        playersMin: 9,
        playersMax: 24,
        playerIds: [],
      })),
    })
  }
  await tx.tournament.update({ where: { id: tournament.id }, data: { totalDates: plan.totalDates } })
  return plan
}
