import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/tournaments/champions-stats
 * Obtener estadísticas detalladas de campeones históricos
 */
export async function GET() {
  try {
    // Obtener todos los campeonatos agrupados por jugador
    const championStats = await prisma.tournamentWinners.groupBy({
      by: ['championId'],
      _count: { championId: true },
      orderBy: { _count: { championId: 'desc' } }
    })

    // Obtener detalles completos de cada campeón
    const championsWithDetails = await Promise.all(
      championStats.map(async (stat) => {
        // Información del jugador
        const player = await prisma.player.findUnique({
          where: { id: stat.championId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            isActive: true,
            aliases: true
          }
        })

        // Torneos ganados
        const wonTournaments = await prisma.tournamentWinners.findMany({
          where: { championId: stat.championId },
          select: { tournamentNumber: true },
          orderBy: { tournamentNumber: 'asc' }
        })

        return {
          player: player,
          championshipsCount: stat._count.championId,
          tournamentNumbers: wonTournaments.map(t => t.tournamentNumber)
        }
      })
    )

    // Separar top 3 del resto
    const top3Champions = championsWithDetails.slice(0, 3)
    const otherChampions = championsWithDetails.slice(3)

    return NextResponse.json({
      success: true,
      data: {
        all: championsWithDetails,
        top3: top3Champions,
        others: otherChampions,
        totalChampions: championsWithDetails.length,
        totalChampionships: championsWithDetails.reduce((sum, c) => sum + c.championshipsCount, 0)
      }
    })

  } catch (error) {
    console.error('Error fetching champions stats:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error fetching champions stats' 
      },
      { status: 500 }
    )
  }
}