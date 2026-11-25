import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandler } from '@/lib/errors'
import { ok, parseParams } from '@/lib/http'
import { tournamentIdParamsSchema } from '@poker/shared'

interface RouteParams {
  params: Promise<{
    tournamentId: string
  }>
}

export const GET = withErrorHandler(async (
  _request: NextRequest,
  context: RouteParams
) => {
  const { tournamentId: tournamentIdNum } = parseParams(await context.params, tournamentIdParamsSchema)

  // Get all eliminations for this tournament
  // Exclude position 1 (winner) since the winner doesn't eliminate anyone
  const eliminations = await prisma.elimination.findMany({
    where: {
      gameDate: {
        tournamentId: tournamentIdNum
      },
      position: { not: 1 } // Winner doesn't count as an elimination
    },
    select: {
      eliminatorPlayerId: true,
      eliminatorPlayer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          isActive: true
        }
      }
    }
  })

  // Count eliminations per player
  const playerStatsMap = new Map<string, {
    player: {
      id: string
      firstName: string
      lastName: string
      photoUrl: string | null
    }
    eliminationCount: number
  }>()

  eliminations.forEach((elim) => {
    const playerId = elim.eliminatorPlayerId

    if (!playerStatsMap.has(playerId)) {
      playerStatsMap.set(playerId, {
        player: {
          id: elim.eliminatorPlayer.id,
          firstName: elim.eliminatorPlayer.firstName,
          lastName: elim.eliminatorPlayer.lastName,
          photoUrl: elim.eliminatorPlayer.photoUrl
        },
        eliminationCount: 0
      })
    }

    const stats = playerStatsMap.get(playerId)!
    stats.eliminationCount++
  })

  // Convert to array and sort by elimination count (descending)
  const playerStats = Array.from(playerStatsMap.values())
    .sort((a, b) => b.eliminationCount - a.eliminationCount)

  return ok({
    players: playerStats,
    totalPlayers: playerStats.length
  })
})
