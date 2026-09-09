import { prisma } from './prisma'
import { calculatePointsForPosition } from './tournament-utils'
import { calculateTournamentRanking, type PlayerRanking } from './ranking-utils'

/**
 * Proyección en vivo del ranking del torneo durante una fecha en curso.
 *
 * La idea: mientras se juega, a los que siguen en mesa se les asignan los
 * puntos que va a recibir el PRÓXIMO eliminado. Así la tabla muestra dónde
 * quedaría cada uno si sale ahora, y se mueve con cada eliminación.
 *
 * Ojo: calculateTournamentRanking() ya incluye la fecha en curso — los
 * eliminados de hoy tienen sus puntos reales y los que siguen jugando tienen
 * un 0 en pointsByDate. Ese 0 además entra al ELIMINA como si fuera una de
 * las peores fechas, así que la proyección lo reemplaza antes de recalcular.
 */

export type LivePlayerState = 'eliminated' | 'playing' | 'absent'

export interface LiveRankingRow {
  playerId: string
  playerName: string
  playerAlias?: string
  /** Posición proyectada, ya con el ELIMINA aplicado. */
  position: number
  /** Posición que tenía antes de que empezara esta fecha. */
  basePosition: number
  /** Positivo = subió puestos respecto al arranque de la fecha. */
  positionsChanged: number
  /** Puntaje final proyectado (total − N peores fechas − multas). */
  score: number
  /** Lo que suma hoy: real si ya salió, proyectado si sigue en mesa. */
  todayPoints: number
  state: LivePlayerState
  /** Posición con la que salió de la fecha (solo si ya fue eliminado). */
  eliminationPosition?: number
}

export interface LiveRankingData {
  gameDate: {
    id: number
    dateNumber: number
    totalPlayers: number
    playersRemaining: number
    eliminationsCount: number
  }
  projection: {
    /** Posición que le toca al próximo eliminado. */
    nextPosition: number
    /** Puntos que se le acreditan a esa posición. */
    nextPoints: number
    /** true = el ELIMINA ya afecta al ranking, no es solo informativo. */
    eliminasActive: boolean
    datesToEliminate: number
  }
  lastElimination: {
    playerName: string
    eliminatorName: string
    position: number
    points: number
  } | null
  rows: LiveRankingRow[]
}

interface ScoreInput {
  pointsByDate: Record<number, number>
  pointPenalty: number
}

/**
 * Puntaje final a partir de los puntos por fecha, aplicando ELIMINA N.
 * Replica la regla de ranking-utils: las N peores fechas solo se descuentan
 * a partir de la mitad del torneo; antes de eso el ELIMINA es informativo.
 */
function finalScoreFrom(
  { pointsByDate, pointPenalty }: ScoreInput,
  totalDates: number,
  datesToEliminate: number
): { score: number; eliminasActive: boolean } {
  const scores = Object.values(pointsByDate)
  const total = scores.reduce((sum, p) => sum + p, 0)
  const threshold = Math.ceil(totalDates / 2)

  if (scores.length < threshold) {
    return { score: total - pointPenalty, eliminasActive: false }
  }

  const worst = [...scores].sort((a, b) => a - b).slice(0, datesToEliminate)
  const dropped = worst.reduce((sum, p) => sum + p, 0)
  return { score: total - dropped - pointPenalty, eliminasActive: true }
}

/**
 * Mismos criterios de desempate que el ranking oficial: puntaje, victorias,
 * segundos, terceros, menos ausencias y por último orden alfabético.
 *
 * Las estadísticas de desempate se toman tal cual del ranking oficial, así
 * que en la tabla base (sin la fecha de hoy) incluyen los podios de hoy. Solo
 * cambia algo ante un empate exacto de puntaje, no vale la pena separarlas.
 */
function compareByScore(
  a: { score: number; ranking: PlayerRanking },
  b: { score: number; ranking: PlayerRanking }
): number {
  if (a.score !== b.score) return b.score - a.score
  if (a.ranking.totalPoints !== b.ranking.totalPoints) return b.ranking.totalPoints - a.ranking.totalPoints
  if (a.ranking.firstPlaces !== b.ranking.firstPlaces) return b.ranking.firstPlaces - a.ranking.firstPlaces
  if (a.ranking.secondPlaces !== b.ranking.secondPlaces) return b.ranking.secondPlaces - a.ranking.secondPlaces
  if (a.ranking.thirdPlaces !== b.ranking.thirdPlaces) return b.ranking.thirdPlaces - a.ranking.thirdPlaces
  if (a.ranking.absences !== b.ranking.absences) return a.ranking.absences - b.ranking.absences
  return a.ranking.playerName.localeCompare(b.ranking.playerName)
}

/** Ordena y asigna posiciones, dejando empatados a los realmente iguales. */
function assignPositions<T extends { score: number; ranking: PlayerRanking }>(entries: T[]): Map<string, number> {
  const sorted = [...entries].sort(compareByScore)
  const positions = new Map<string, number>()

  let currentPosition = 1
  sorted.forEach((entry, index) => {
    if (index > 0 && compareByScore(sorted[index - 1], entry) !== 0) {
      currentPosition = index + 1
    }
    positions.set(entry.ranking.playerId, currentPosition)
  })

  return positions
}

export interface LiveDateSnapshot {
  dateNumber: number
  playerIds: string[]
  eliminations: Array<{ eliminatedPlayerId: string; position: number; points: number }>
}

/**
 * Núcleo puro de la proyección: sin acceso a base de datos, para poder
 * probarlo replicando fechas ya jugadas eliminación por eliminación.
 */
export function projectLiveRanking(
  rankings: PlayerRanking[],
  snapshot: LiveDateSnapshot,
  totalDates: number,
  datesToEliminate: number
): { rows: LiveRankingRow[]; projection: LiveRankingData['projection']; playersRemaining: number } {
  const totalPlayers = snapshot.playerIds.length
  const eliminationsCount = snapshot.eliminations.length
  const playersRemaining = totalPlayers - eliminationsCount

  // Las posiciones se reparten de la más alta (primer eliminado) hacia la 1.
  const nextPosition = playersRemaining
  const nextPoints = playersRemaining > 0 ? calculatePointsForPosition(nextPosition, totalPlayers) : 0

  const eliminationByPlayer = new Map(snapshot.eliminations.map((e) => [e.eliminatedPlayerId, e]))
  const inDate = new Set(snapshot.playerIds)

  const projected: Array<{ score: number; ranking: PlayerRanking; todayPoints: number; state: LivePlayerState }> = []
  const base: Array<{ score: number; ranking: PlayerRanking }> = []
  let eliminasActive = false

  for (const player of rankings) {
    const pointPenalty = player.pointPenalty ?? 0
    const elimination = eliminationByPlayer.get(player.playerId)

    let state: LivePlayerState
    let todayPoints: number

    if (elimination) {
      state = 'eliminated'
      todayPoints = elimination.points
    } else if (!inDate.has(player.playerId)) {
      state = 'absent'
      todayPoints = 0
    } else if (playersRemaining === 1) {
      // Último en pie: el ranking oficial ya le acreditó los puntos de
      // ganador, así que su cifra es real y no una proyección.
      state = 'eliminated'
      todayPoints = player.pointsByDate[snapshot.dateNumber] ?? 0
    } else {
      state = 'playing'
      todayPoints = nextPoints
    }

    const projectedPoints = { ...player.pointsByDate, [snapshot.dateNumber]: todayPoints }
    const projectedScore = finalScoreFrom({ pointsByDate: projectedPoints, pointPenalty }, totalDates, datesToEliminate)
    eliminasActive = projectedScore.eliminasActive

    const basePoints = { ...player.pointsByDate }
    delete basePoints[snapshot.dateNumber]
    const baseScore = finalScoreFrom({ pointsByDate: basePoints, pointPenalty }, totalDates, datesToEliminate)

    projected.push({ score: projectedScore.score, ranking: player, todayPoints, state })
    base.push({ score: baseScore.score, ranking: player })
  }

  const projectedPositions = assignPositions(projected)
  const basePositions = assignPositions(base)

  const rows: LiveRankingRow[] = projected
    .map((entry) => {
      const position = projectedPositions.get(entry.ranking.playerId)!
      const basePosition = basePositions.get(entry.ranking.playerId)!

      return {
        playerId: entry.ranking.playerId,
        playerName: entry.ranking.playerName,
        playerAlias: entry.ranking.playerAlias,
        position,
        basePosition,
        positionsChanged: basePosition - position,
        score: entry.score,
        todayPoints: entry.todayPoints,
        state: entry.state,
        eliminationPosition: eliminationByPlayer.get(entry.ranking.playerId)?.position
      }
    })
    .sort((a, b) => a.position - b.position || a.playerName.localeCompare(b.playerName))

  return {
    rows,
    projection: { nextPosition, nextPoints, eliminasActive, datesToEliminate },
    playersRemaining
  }
}

export async function calculateLiveRanking(gameDateId: number): Promise<LiveRankingData | null> {
  const gameDate = await prisma.gameDate.findUnique({
    where: { id: gameDateId },
    include: {
      tournament: { select: { id: true, totalDates: true, datesToEliminate: true } },
      eliminations: {
        include: {
          eliminatedPlayer: { select: { firstName: true, lastName: true } },
          eliminatorPlayer: { select: { firstName: true, lastName: true } }
        }
      }
    }
  })

  if (!gameDate || gameDate.status !== 'in_progress') return null

  const ranking = await calculateTournamentRanking(gameDate.tournament.id)
  if (!ranking) return null

  const { rows, projection, playersRemaining } = projectLiveRanking(
    ranking.rankings,
    {
      dateNumber: gameDate.dateNumber,
      playerIds: gameDate.playerIds,
      eliminations: gameDate.eliminations
    },
    gameDate.tournament.totalDates ?? 12,
    gameDate.tournament.datesToEliminate ?? 2
  )

  // La eliminación más reciente es la de menor posición asignada.
  const latest = gameDate.eliminations.reduce<(typeof gameDate.eliminations)[number] | null>(
    (min, e) => (!min || e.position < min.position ? e : min),
    null
  )

  return {
    gameDate: {
      id: gameDate.id,
      dateNumber: gameDate.dateNumber,
      totalPlayers: gameDate.playerIds.length,
      playersRemaining,
      eliminationsCount: gameDate.eliminations.length
    },
    projection,
    lastElimination: latest
      ? {
          playerName: `${latest.eliminatedPlayer.firstName} ${latest.eliminatedPlayer.lastName}`,
          eliminatorName: `${latest.eliminatorPlayer.firstName} ${latest.eliminatorPlayer.lastName}`,
          position: latest.position,
          points: latest.points
        }
      : null,
    rows
  }
}
