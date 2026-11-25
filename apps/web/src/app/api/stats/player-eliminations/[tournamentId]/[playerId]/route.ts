import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseParams } from '@/lib/http'
import { tournamentPlayerParamsSchema } from '@poker/shared'

interface RouteParams {
  params: Promise<{
    tournamentId: string
    playerId: string
  }>
}

export const GET = withErrorHandler(async (
  _request: NextRequest,
  context: RouteParams
) => {
  const { tournamentId: tournamentIdNum, playerId } = parseParams(await context.params, tournamentPlayerParamsSchema)

  // Get eliminator player
  const eliminator = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      photoUrl: true
    }
  })

  if (!eliminator) {
    throw AppError.notFound('Jugador no encontrado')
  }

  // Get all eliminations by this player in the tournament
  // Exclude position 1 (winner) since the winner doesn't eliminate anyone
  const eliminations = await prisma.elimination.findMany({
    where: {
      eliminatorPlayerId: playerId,
      gameDate: {
        tournamentId: tournamentIdNum
      },
      position: { not: 1 } // Winner doesn't count as an elimination
    },
    include: {
      eliminatedPlayer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true
        }
      },
      gameDate: {
        select: {
          id: true,
          dateNumber: true,
          scheduledDate: true
        }
      }
    },
    orderBy: [
      { gameDate: { dateNumber: 'asc' } },
      { position: 'asc' }
    ]
  })

  // Group eliminations by victim
  const victimsMap = new Map<string, {
    player: typeof eliminator
    count: number
    eliminations: Array<{
      dateNumber: number
      scheduledDate: string
      position: number
      gameDateId: number
    }>
  }>()

  eliminations.forEach((elim) => {
    const victimId = elim.eliminatedPlayer.id

    if (!victimsMap.has(victimId)) {
      victimsMap.set(victimId, {
        player: elim.eliminatedPlayer,
        count: 0,
        eliminations: []
      })
    }

    const victim = victimsMap.get(victimId)!
    victim.count++
    victim.eliminations.push({
      dateNumber: elim.gameDate.dateNumber,
      scheduledDate: elim.gameDate.scheduledDate.toISOString(),
      position: elim.position,
      gameDateId: elim.gameDate.id
    })
  })

  // Convert map to array and sort by count (descending)
  const victims = Array.from(victimsMap.values()).sort((a, b) => b.count - a.count)

  return ok({
    eliminator,
    totalEliminations: eliminations.length,
    victims
  })
})
