import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/tournaments/podium-stats
 * Obtener estadísticas de podios (1°, 2°, 3°) por jugador
 */
export async function GET() {
  try {
    // Obtener todos los jugadores únicos que han estado en podios
    const allPlayers = new Set<string>()
    const allTournaments = await prisma.tournamentWinners.findMany({
      select: { championId: true, runnerUpId: true, thirdPlaceId: true }
    })

    allTournaments.forEach(t => {
      allPlayers.add(t.championId)
      allPlayers.add(t.runnerUpId)
      allPlayers.add(t.thirdPlaceId)
    })

    // Calcular estadísticas para cada jugador
    const podiumStats = await Promise.all(
      Array.from(allPlayers).map(async (playerId) => {
        // Información del jugador
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            isActive: true,
            aliases: true
          }
        })

        if (!player) return null

        // Contar posiciones
        const firstPlaces = await prisma.tournamentWinners.count({
          where: { championId: playerId }
        })

        const secondPlaces = await prisma.tournamentWinners.count({
          where: { runnerUpId: playerId }
        })

        const thirdPlaces = await prisma.tournamentWinners.count({
          where: { thirdPlaceId: playerId }
        })

        const totalPodiums = firstPlaces + secondPlaces + thirdPlaces

        return {
          player: player,
          firstPlaces: firstPlaces,
          secondPlaces: secondPlaces,
          thirdPlaces: thirdPlaces,
          totalPodiums: totalPodiums
        }
      })
    )

    // Filtrar nulls y ordenar por total de podios
    const validStats = podiumStats
      .filter((stat): stat is NonNullable<typeof stat> => stat !== null)
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

    return NextResponse.json({
      success: true,
      data: {
        players: validStats,
        summary: {
          totalPlayersInPodiums: validStats.length,
          totalFirstPlaces: totalFirstPlaces,
          totalSecondPlaces: totalSecondPlaces,
          totalThirdPlaces: totalThirdPlaces,
          totalPodiumAppearances: totalPodiumAppearances,
          averagePodiumsPerPlayer: Math.round((totalPodiumAppearances / validStats.length) * 10) / 10
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