import type { PrismaClient } from '@prisma/client'
import { FALLBACK_TOURNAMENT_WINNERS } from './fallback-tournament-winners'

type WinnerPlayer = {
  id: string
  firstName: string
  lastName: string
  photoUrl: string | null
  isActive: boolean
  aliases: string[]
}

const playerSelection = {
  id: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
  isActive: true,
  aliases: true
} as const

const playerCache = new Map<string, WinnerPlayer | null>()

async function resolvePlayerByFullName(prisma: PrismaClient, fullName: string) {
  const normalized = fullName.trim().toLowerCase()
  if (playerCache.has(normalized)) {
    return playerCache.get(normalized) ?? null
  }

  const trimmed = fullName.trim()
  const lastSpace = trimmed.lastIndexOf(' ')
  if (lastSpace === -1) {
    console.warn(`⚠️  Nombre inválido en fallback de ganadores: "${fullName}"`)
    playerCache.set(normalized, null)
    return null
  }

  const firstName = trimmed.slice(0, lastSpace).trim()
  const lastName = trimmed.slice(lastSpace + 1).trim()

  const player = await prisma.player.findFirst({
    where: {
      firstName: {
        equals: firstName,
        mode: 'insensitive'
      },
      lastName: {
        equals: lastName,
        mode: 'insensitive'
      }
    },
    select: playerSelection
  })

  if (!player) {
    console.warn(`⚠️  No se encontró jugador para "${fullName}" al aplicar fallback de ganadores`)
    playerCache.set(normalized, null)
    return null
  }

  const formatted: WinnerPlayer = {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    photoUrl: player.photoUrl,
    isActive: player.isActive,
    aliases: player.aliases
  }

  playerCache.set(normalized, formatted)
  return formatted
}

export async function getTournamentWinnersWithFallback(prisma: PrismaClient) {
  const winners = await prisma.tournamentWinners.findMany({
    include: {
      champion: { select: playerSelection },
      runnerUp: { select: playerSelection },
      thirdPlace: { select: playerSelection },
      siete: { select: playerSelection },
      dos: { select: playerSelection }
    },
    orderBy: { tournamentNumber: 'asc' }
  })

  type TournamentWinnerRecord = typeof winners[number]

  const winnersMap = new Map<number, TournamentWinnerRecord>()
  winners.forEach(winner => winnersMap.set(winner.tournamentNumber, winner))

  const fallbackResults: TournamentWinnerRecord[] = []

  for (const fallback of FALLBACK_TOURNAMENT_WINNERS) {
    if (winnersMap.has(fallback.tournamentNumber)) continue

    const [champion, runnerUp, thirdPlace, siete, dos] = await Promise.all([
      resolvePlayerByFullName(prisma, fallback.champion),
      resolvePlayerByFullName(prisma, fallback.runnerUp),
      resolvePlayerByFullName(prisma, fallback.thirdPlace),
      resolvePlayerByFullName(prisma, fallback.siete),
      resolvePlayerByFullName(prisma, fallback.dos)
    ])

    if (!champion || !runnerUp || !thirdPlace || !siete || !dos) {
      console.warn(`⚠️  No se pudo crear registro fallback para el Torneo ${fallback.tournamentNumber} por datos faltantes`)
      continue
    }

    fallbackResults.push({
      id: -fallback.tournamentNumber,
      tournamentNumber: fallback.tournamentNumber,
      championId: champion.id,
      runnerUpId: runnerUp.id,
      thirdPlaceId: thirdPlace.id,
      sieteId: siete.id,
      dosId: dos.id,
      createdAt: new Date(),
      champion,
      runnerUp,
      thirdPlace,
      siete,
      dos
    } as TournamentWinnerRecord)
  }

  const combined = [...winners, ...fallbackResults]
  combined.sort((a, b) => a.tournamentNumber - b.tournamentNumber)
  return combined
}

export async function getTournamentWinnerByNumber(prisma: PrismaClient, tournamentNumber: number) {
  const winners = await getTournamentWinnersWithFallback(prisma)
  return winners.find(winner => winner.tournamentNumber === tournamentNumber) ?? null
}

/**
 * Automatically generates TournamentWinners record from tournament final ranking
 * This ensures historical tournament results are preserved when a tournament completes
 */
export async function generateTournamentWinners(prisma: PrismaClient, tournamentId: number) {
  try {
    // Get tournament info
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { number: true, status: true }
    })

    if (!tournament) {
      throw new Error(`Tournament with ID ${tournamentId} not found`)
    }

    // Check if TournamentWinners already exists
    const existingWinners = await prisma.tournamentWinners.findFirst({
      where: { tournamentNumber: tournament.number }
    })

    if (existingWinners) {
      console.log(`⚠️  TournamentWinners already exists for Tournament ${tournament.number}`)
      return existingWinners
    }

    // Import ranking function here to avoid circular dependencies
    const { calculateTournamentRanking } = await import('./ranking-utils')

    // Get final tournament ranking
    const rankingData = await calculateTournamentRanking(tournamentId)

    if (!rankingData || rankingData.rankings.length === 0) {
      throw new Error(`Cannot generate winners: No ranking data available for tournament ${tournament.number}`)
    }

    const { rankings } = rankingData

    // Validate we have minimum required positions
    if (rankings.length < 7) {
      throw new Error(`Cannot generate winners: Tournament ${tournament.number} has insufficient players (${rankings.length}, minimum 7 required)`)
    }

    // Extract winner positions based on final ranking
    const champions = {
      champion: rankings[0],         // 1st place
      runnerUp: rankings[1],         // 2nd place
      thirdPlace: rankings[2],       // 3rd place
      siete: rankings[6],            // 7th place
      dos: rankings[rankings.length - 1]  // Last place
    }

    // Create TournamentWinners record
    const tournamentWinners = await prisma.tournamentWinners.create({
      data: {
        tournamentNumber: tournament.number,
        championId: champions.champion.playerId,
        runnerUpId: champions.runnerUp.playerId,
        thirdPlaceId: champions.thirdPlace.playerId,
        sieteId: champions.siete.playerId,
        dosId: champions.dos.playerId
      },
      include: {
        champion: { select: playerSelection },
        runnerUp: { select: playerSelection },
        thirdPlace: { select: playerSelection },
        siete: { select: playerSelection },
        dos: { select: playerSelection }
      }
    })

    console.log(`✅ Auto-generated TournamentWinners for Tournament ${tournament.number}:`)
    console.log(`   🥇 Champion: ${champions.champion.playerName}`)
    console.log(`   🥈 Runner-up: ${champions.runnerUp.playerName}`)
    console.log(`   🥉 Third: ${champions.thirdPlace.playerName}`)
    console.log(`   7️⃣ Siete: ${champions.siete.playerName}`)
    console.log(`   2️⃣ Dos: ${champions.dos.playerName}`)

    return tournamentWinners

  } catch (error) {
    console.error(`❌ Error generating TournamentWinners for tournament ${tournamentId}:`, error)
    throw error
  }
}
