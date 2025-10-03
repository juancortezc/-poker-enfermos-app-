import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTournamentWinnersWithFallback } from '@/lib/tournament-winners'

/**
 * GET /api/tournaments/podium-stats
 * Obtener estadísticas de podios (1°, 2°, 3°) por jugador
 */
export async function GET() {
  try {
    const winners = await getTournamentWinnersWithFallback(prisma)

    const podiumMap = new Map<string, {
      player: (typeof winners)[number]['champion']
      firstPlaces: number
      secondPlaces: number
      thirdPlaces: number
      totalPodiums: number
    }>()

    const increment = (
      player: (typeof winners)[number]['champion'],
      position: 'firstPlaces' | 'secondPlaces' | 'thirdPlaces'
    ) => {
      if (!player) return
      const existing = podiumMap.get(player.id)
      if (existing) {
        existing[position] += 1
        existing.totalPodiums += 1
      } else {
        podiumMap.set(player.id, {
          player,
          firstPlaces: position === 'firstPlaces' ? 1 : 0,
          secondPlaces: position === 'secondPlaces' ? 1 : 0,
          thirdPlaces: position === 'thirdPlaces' ? 1 : 0,
          totalPodiums: 1
        })
      }
    }

    winners.forEach(winner => {
      increment(winner.champion, 'firstPlaces')
      increment(winner.runnerUp, 'secondPlaces')
      increment(winner.thirdPlace, 'thirdPlaces')
    })

    const validStats = Array.from(podiumMap.values())
      .sort((a, b) => {
        // Ordenar por total de podios, luego por primeros lugares
        if (b.totalPodiums !== a.totalPodiums) {
          return b.totalPodiums - a.totalPodiums
        }
        if (b.firstPlaces !== a.firstPlaces) {
          return b.firstPlaces - a.firstPlaces
        }
        if (b.secondPlaces !== a.secondPlaces) {
          return b.secondPlaces - a.secondPlaces
        }
        return b.thirdPlaces - a.thirdPlaces
      })

    // Calcular estadísticas generales
    const totalFirstPlaces = validStats.reduce((sum, s) => sum + s.firstPlaces, 0)
    const totalSecondPlaces = validStats.reduce((sum, s) => sum + s.secondPlaces, 0)
    const totalThirdPlaces = validStats.reduce((sum, s) => sum + s.thirdPlaces, 0)
    const totalPodiumAppearances = validStats.reduce((sum, s) => sum + s.totalPodiums, 0)

    const playersCount = validStats.length
    const averagePodiumsPerPlayer = playersCount > 0
      ? Math.round((totalPodiumAppearances / playersCount) * 10) / 10
      : 0

    return NextResponse.json({
      success: true,
      data: {
        players: validStats,
        summary: {
          totalPlayersInPodiums: playersCount,
          totalFirstPlaces: totalFirstPlaces,
          totalSecondPlaces: totalSecondPlaces,
          totalThirdPlaces: totalThirdPlaces,
          totalPodiumAppearances: totalPodiumAppearances,
          averagePodiumsPerPlayer
        }
      }
    })

  } catch (error) {
    console.error('Error fetching podium stats:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error fetching podium stats' 
      },
      { status: 500 }
    )
  }
}
