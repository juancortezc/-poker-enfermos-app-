import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    tournamentId: string
  }>
}

export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { tournamentId } = await context.params
    const tournamentIdNum = parseInt(tournamentId)

    if (isNaN(tournamentIdNum)) {
      return NextResponse.json(
        { error: 'ID de torneo inválido' },
        { status: 400 }
      )
    }

    // Get all eliminations for this tournament
    const eliminations = await prisma.elimination.findMany({
      where: {
        gameDate: {
          tournamentId: tournamentIdNum
        }
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

    return NextResponse.json({
      players: playerStats,
      totalPlayers: playerStats.length
    })
  } catch (error) {
    console.error('Error fetching player elimination stats:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas de eliminaciones' },
      { status: 500 }
    )
  }
}
