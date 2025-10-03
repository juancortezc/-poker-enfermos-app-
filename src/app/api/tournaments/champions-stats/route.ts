import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTournamentWinnersWithFallback } from '@/lib/tournament-winners'

/**
 * GET /api/tournaments/champions-stats
 * Obtener estadísticas detalladas de campeones históricos
 */
export async function GET() {
  try {
    const winners = await getTournamentWinnersWithFallback(prisma)

    const championsMap = new Map<string, {
      player: (typeof winners)[number]['champion']
      championshipsCount: number
      tournamentNumbers: number[]
    }>()

    winners.forEach(winner => {
      const champion = winner.champion
      if (!champion) return

      const existing = championsMap.get(champion.id)
      if (existing) {
        existing.championshipsCount += 1
        existing.tournamentNumbers.push(winner.tournamentNumber)
      } else {
        championsMap.set(champion.id, {
          player: champion,
          championshipsCount: 1,
          tournamentNumbers: [winner.tournamentNumber]
        })
      }
    })

    const championsWithDetails = Array.from(championsMap.values())
      .sort((a, b) => {
        if (b.championshipsCount !== a.championshipsCount) {
          return b.championshipsCount - a.championshipsCount
        }

        // Si empatan, el que ganó más recientemente primero
        const latestA = Math.max(...a.tournamentNumbers)
        const latestB = Math.max(...b.tournamentNumbers)
        if (latestB !== latestA) {
          return latestB - latestA
        }

        // Como último criterio, ordenar alfabéticamente
        const nameA = `${a.player.firstName} ${a.player.lastName}`.toLowerCase()
        const nameB = `${b.player.firstName} ${b.player.lastName}`.toLowerCase()
        return nameA.localeCompare(nameB)
      })

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
