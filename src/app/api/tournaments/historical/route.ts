import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTournamentWinnersWithFallback } from '@/lib/tournament-winners'

/**
 * GET /api/tournaments/historical
 * Obtener estadísticas históricas completas de todos los torneos
 */
export async function GET() {
  try {
    // Obtener todos los ganadores históricos
    const winners = await getTournamentWinnersWithFallback(prisma)

    // Calcular estadísticas por jugador
    const playerStats = new Map()

    winners.forEach(tournament => {
      // Función helper para actualizar stats
      const updatePlayerStats = (player: { id: string; firstName: string; lastName: string; alias?: string; photoUrl?: string; isActive: boolean }, position: string) => {
        const playerId = player.id
        if (!playerStats.has(playerId)) {
          playerStats.set(playerId, {
            player: player,
            championWins: 0,
            runnerUpWins: 0,
            thirdPlaceWins: 0,
            sietePositions: 0,
            dosPositions: 0,
            totalAppearances: 0
          })
        }

        const stats = playerStats.get(playerId)
        stats[position]++
        stats.totalAppearances++
      }

      updatePlayerStats(tournament.champion, 'championWins')
      updatePlayerStats(tournament.runnerUp, 'runnerUpWins')
      updatePlayerStats(tournament.thirdPlace, 'thirdPlaceWins')
      updatePlayerStats(tournament.siete, 'sietePositions')
      updatePlayerStats(tournament.dos, 'dosPositions')
    })

    // Convertir a array y ordenar por campeonatos
    const playerStatsArray = Array.from(playerStats.values())
      .sort((a, b) => {
        // Ordenar por campeonatos, luego subcampeonatos, luego total de apariciones
        if (b.championWins !== a.championWins) {
          return b.championWins - a.championWins
        }
        if (b.runnerUpWins !== a.runnerUpWins) {
          return b.runnerUpWins - a.runnerUpWins
        }
        return b.totalAppearances - a.totalAppearances
      })

    // Estadísticas generales
    const totalTournaments = winners.length
    const activePlayersInHistory = playerStatsArray.filter(p => p.player.isActive).length
    const historicalPlayersCount = playerStatsArray.filter(p => !p.player.isActive).length

    return NextResponse.json({
      success: true,
      data: {
        tournaments: winners,
        playerStats: playerStatsArray,
        summary: {
          totalTournaments,
          activePlayersInHistory,
          historicalPlayersCount,
          totalPlayersInHistory: playerStatsArray.length
        }
      }
    })

  } catch (error) {
    console.error('Error fetching historical data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error fetching historical data' 
      },
      { status: 500 }
    )
  }
}
