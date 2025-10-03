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
