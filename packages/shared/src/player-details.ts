/**
 * Detalle de un jugador dentro de un torneo, armado en el cliente a partir de
 * datos ya cargados (ranking, fechas, eliminaciones por fecha y datos
 * publicos del jugador). Lo usan el perfil de jugador de la web
 * (usePlayerTournamentDetails) y el de la app movil.
 *
 * Puro: no pide nada a la red ni toca React.
 */
import type { PlayerRanking, TournamentRankingData } from './ranking'

/** Una fila del rendimiento por fecha. */
export interface DatePerformance {
  dateNumber: number
  status: 'completed' | 'in_progress' | 'pending' | 'CREATED'
  eliminationPosition?: number
  eliminatedBy?: {
    name: string
    alias?: string
    isGuest: boolean
  }
  points: number
  rankingPosition?: number
  isAbsent?: boolean
}

export interface PlayerTournamentDetails {
  player: {
    id: string
    firstName: string
    lastName: string
    aliases: string[]
    photoUrl?: string
    lastVictoryDate?: string
  }
  currentStats: {
    position: number
    totalPoints: number
    pointsByDate: { [dateNumber: number]: number }
    elimina1?: number
    elimina2?: number
    elimina3?: number
    eliminasActive?: boolean
    finalScore?: number
  }
  datesToEliminate: number
  datePerformance: DatePerformance[]
  rankingEvolution: RankingEvolutionPoint[]
  bestResult: string
}

export interface RankingEvolutionPoint {
  dateNumber: number
  position: number
  points: number
}

export interface PlayerPublicData {
  id: string
  firstName: string
  lastName: string
  aliases?: string[]
  photoUrl?: string
  lastVictoryDate?: string
}

export interface DetailsGameDate {
  id: number
  dateNumber: number
  status: string
  playerIds?: string[]
}

export interface DetailsEliminationRecord {
  eliminatedPlayer: { id: string; firstName: string; lastName: string }
  eliminatorPlayer?: { firstName: string; lastName: string } | null
  position: number
  points: number
}

export interface DetailsDateWithEliminations {
  id: number
  eliminations?: DetailsEliminationRecord[]
}

/**
 * Arma el detalle. Lanza si el jugador no figura en el ranking del torneo.
 */
export function buildPlayerTournamentDetails(input: {
  playerId: string
  ranking: Pick<TournamentRankingData, 'rankings' | 'tournament'>
  gameDates: DetailsGameDate[]
  datesWithEliminations: DetailsDateWithEliminations[]
  player: PlayerPublicData
}): PlayerTournamentDetails {
  const { playerId, ranking: rankingData, gameDates, datesWithEliminations, player } = input
  const playerRanking = rankingData.rankings.find(r => r.playerId === playerId)

  if (!playerRanking) {
    throw new Error('Player not found in tournament ranking')
  }

  const eliminationMap = new Map<number, DetailsEliminationRecord[]>(
    datesWithEliminations.map(d => [d.id, d.eliminations ?? []])
  )

  const computeFallbackPosition = (dateNumber: number) => {
    if (!rankingData.rankings.length) return null

    const playersForDate = rankingData.rankings
      .map(r => ({ playerId: r.playerId, points: r.pointsByDate?.[dateNumber] }))
      .filter(entry => entry.points !== undefined && entry.points !== null)

    if (!playersForDate.length) return null

    playersForDate.sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    const index = playersForDate.findIndex(entry => entry.playerId === playerId)

    return index === -1 ? null : index + 1
  }

  const datePerformance = gameDates.map((date): DatePerformance => {
    const baseDate: DatePerformance = {
      dateNumber: date.dateNumber,
      status: date.status as DatePerformance['status'],
      points: playerRanking.pointsByDate[date.dateNumber] || 0
    }

    if (date.status === 'completed' && date.id) {
      const eliminations = eliminationMap.get(date.id) || []
      const playerElimination = eliminations.find(e => e.eliminatedPlayer.id === playerId)

      if (playerElimination) {
        return {
          ...baseDate,
          eliminationPosition: playerElimination.position,
          eliminatedBy: playerElimination.eliminatorPlayer
            ? {
                name: `${playerElimination.eliminatorPlayer.firstName} ${playerElimination.eliminatorPlayer.lastName}`,
                alias: playerElimination.eliminatorPlayer.firstName || '',
                isGuest: false
              }
            : undefined
        }
      }

      const totalPlayers = date.playerIds?.length || 0
      const eliminatedCount = eliminations.length

      // Ausencia = no figurar en la lista de la fecha. Deducirla de
      // "0 puntos" marcaba como ausente a quien si estuvo y salio
      // primero, que es justo el que menos merece que lo borren.
      if (!date.playerIds?.includes(playerId)) {
        return { ...baseDate, isAbsent: true }
      }

      if (eliminatedCount === totalPlayers - 1) {
        return { ...baseDate, eliminationPosition: undefined, eliminatedBy: undefined }
      }
    }

    const fallbackPosition = computeFallbackPosition(date.dateNumber)
    if (fallbackPosition) {
      return { ...baseDate, eliminationPosition: fallbackPosition, eliminatedBy: undefined }
    }

    return baseDate
  })

  const rankingEvolution = calculateRankingEvolution(
    playerRanking.pointsByDate,
    rankingData.rankings,
    playerId,
    rankingData.tournament?.totalDates ?? 12,
    rankingData.tournament?.datesToEliminate ?? 2
  )

  let bestResultLabel = 'Sin datos'
  let bestNumericPosition = Number.POSITIVE_INFINITY

  datePerformance
    .filter(date => date.status === 'completed' && !date.isAbsent)
    .forEach(date => {
      // Sin posicion registrada no se asume nada: tomarlo como 1
      // convertia un dato faltante en una victoria inventada.
      const numericPosition = date.eliminationPosition
      if (numericPosition !== undefined && numericPosition < bestNumericPosition) {
        bestNumericPosition = numericPosition
        bestResultLabel = numericPosition === 1 ? 'Ganador' : `${numericPosition}° lugar`
      }
    })

  if (bestNumericPosition === Number.POSITIVE_INFINITY) {
    bestResultLabel = 'Sin participación'
  }

  return {
    player: {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      aliases: player.aliases || [],
      photoUrl: player.photoUrl,
      lastVictoryDate: player.lastVictoryDate
    },
    currentStats: {
      position: playerRanking.position,
      totalPoints: playerRanking.totalPoints,
      pointsByDate: playerRanking.pointsByDate,
      elimina1: playerRanking.elimina1,
      elimina2: playerRanking.elimina2,
      elimina3: playerRanking.elimina3,
      eliminasActive: playerRanking.eliminasActive,
      finalScore: playerRanking.finalScore
    },
    datesToEliminate: rankingData.tournament?.datesToEliminate ?? 2,
    datePerformance: datePerformance.sort((a, b) => a.dateNumber - b.dateNumber),
    rankingEvolution,
    bestResult: bestResultLabel
  }
}

/**
 * Posicion del jugador en la tabla despues de cada fecha jugada, con el
 * ELIMINA N aplicado desde la mitad del torneo.
 */
export function calculateRankingEvolution(
  playerPointsByDate: { [dateNumber: number]: number },
  allRankings: Array<Pick<PlayerRanking, 'playerId' | 'pointsByDate'>>,
  targetPlayerId: string,
  totalDates: number = 12,
  datesToEliminate: number = 2
): RankingEvolutionPoint[] {
  const allPlayedDates = new Set<number>()
  allRankings.forEach(r => {
    Object.keys(r.pointsByDate).forEach(date => allPlayedDates.add(Number(date)))
  })

  const sortedDates = Array.from(allPlayedDates).sort((a, b) => a - b)

  // Umbral para aplicar el ELIMINA (mitad de las fechas)
  const eliminationThreshold = Math.ceil(totalDates / 2)

  const calculateFinalScore = (pointsByDate: { [key: number]: number }, upToDateNumber: number): number => {
    const datesUpTo = sortedDates.filter(d => d <= upToDateNumber)
    const scores = datesUpTo.map(d => pointsByDate[d] || 0)
    const totalPoints = scores.reduce((sum, pts) => sum + pts, 0)

    if (datesUpTo.length >= eliminationThreshold) {
      const eliminatedSum = [...scores]
        .sort((a, b) => a - b)
        .slice(0, datesToEliminate)
        .reduce((sum, s) => sum + s, 0)
      return totalPoints - eliminatedSum
    }

    return totalPoints
  }

  return sortedDates.map(dateNumber => {
    const playerFinalScore = calculateFinalScore(playerPointsByDate, dateNumber)
    const rankingsAtDate = allRankings
      .map(r => ({ playerId: r.playerId, finalScore: calculateFinalScore(r.pointsByDate, dateNumber) }))
      .sort((a, b) => b.finalScore - a.finalScore)

    const position = rankingsAtDate.findIndex(r => r.playerId === targetPlayerId) + 1

    return {
      dateNumber,
      position: position > 0 ? position : allRankings.length + 1,
      points: playerFinalScore
    }
  })
}
