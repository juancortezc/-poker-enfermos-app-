import { prisma } from '@/lib/prisma'
import { getPointPenaltiesByPlayer } from '@/lib/player-adjustments'
import type { TSInput } from '@poker/shared'

export interface TournamentStatsPlayer {
  id: string
  firstName: string
  lastName: string
  photoUrl: string | null
  role: string
  lastVictoryDate: string | null
}

/** "YYYY-MM-DD" de una fecha programada (se guardan al mediodia UTC). */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Carga, sin escribir nada, lo que necesitan los calculos puros de
 * @poker/shared (premios, reporte): inscritos, fechas cerradas con sus
 * eliminaciones, todos los jugadores que aparecen y las multas de puntos.
 */
export async function loadTournamentStatsInput(tournamentId: number) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      number: true,
      name: true,
      status: true,
      totalDates: true,
      datesToEliminate: true,
      tournamentParticipants: { select: { playerId: true } }
    }
  })
  if (!tournament) return null

  // Solo fechas cerradas: una fecha en curso no tiene resultado todavia.
  const gameDates = await prisma.gameDate.findMany({
    where: { tournamentId, status: 'completed' },
    orderBy: { dateNumber: 'asc' },
    select: {
      id: true,
      dateNumber: true,
      scheduledDate: true,
      playerIds: true,
      eliminations: {
        select: { eliminatedPlayerId: true, eliminatorPlayerId: true, position: true, points: true },
        orderBy: { position: 'desc' }
      }
    }
  })

  const registeredIds = tournament.tournamentParticipants.map(tp => tp.playerId)
  const ids = new Set<string>(registeredIds)
  gameDates.forEach(gd => {
    gd.playerIds.forEach(id => ids.add(id))
    gd.eliminations.forEach(e => { ids.add(e.eliminatedPlayerId); ids.add(e.eliminatorPlayerId) })
  })

  const players: TournamentStatsPlayer[] = await prisma.player.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, firstName: true, lastName: true, photoUrl: true, role: true, lastVictoryDate: true }
  })
  const playersById = new Map(players.map(p => [p.id, p]))

  const pointPenalties = await getPointPenaltiesByPlayer(tournamentId)

  const input: TSInput = {
    tournament: {
      number: tournament.number,
      name: tournament.name,
      status: tournament.status,
      totalDates: tournament.totalDates,
      datesToEliminate: tournament.datesToEliminate
    },
    players: players.map(p => ({ id: p.id, name: `${p.firstName} ${p.lastName}`.trim(), role: p.role })),
    registeredIds,
    gameDates: gameDates.map(gd => ({
      dateNumber: gd.dateNumber,
      scheduledDate: isoDay(gd.scheduledDate),
      playerIds: gd.playerIds,
      eliminations: gd.eliminations
    })),
    pointPenalties
  }

  return { tournament, input, playersById, gameDates }
}
