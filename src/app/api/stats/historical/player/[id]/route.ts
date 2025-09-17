import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// GET /api/stats/historical/player/[id] - Get historical statistics for a specific player
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (request, user) => {

    const playerId = params.id

    // Verify player exists
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        joinYear: true
      }
    })

    if (!player) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
    }

    // Get all historical stats for this player
    const playerHistoricalStats = await prisma.historicalTournamentStats.findMany({
      where: { playerId },
      orderBy: { tournamentNumber: 'asc' }
    })

    // Calculate detailed statistics
    const stats = {
      playerInfo: player,
      totalTournaments: playerHistoricalStats.length,
      wins: playerHistoricalStats.filter(stat => stat.isWinner).length,
      secondPlaces: playerHistoricalStats.filter(stat => stat.isSecondPlace).length,
      thirdPlaces: playerHistoricalStats.filter(stat => stat.isThirdPlace).length,
      seventhPlaces: playerHistoricalStats.filter(stat => stat.is7thPlace).length,
      secondToLastPlaces: playerHistoricalStats.filter(stat => stat.is2ndToLast).length,
      topThreeFinishes: 0,
      averagePosition: 0,
      bestFinish: null as number | null,
      worstFinish: null as number | null,
      winPercentage: 0,
      topThreePercentage: 0,
      tournamentHistory: [] as any[]
    }

    if (playerHistoricalStats.length > 0) {
      // Calculate top three finishes
      stats.topThreeFinishes = stats.wins + stats.secondPlaces + stats.thirdPlaces

      // Calculate average position
      const positions = playerHistoricalStats.map(stat => stat.finalPosition)
      stats.averagePosition = positions.reduce((sum, pos) => sum + pos, 0) / positions.length

      // Find best and worst finishes
      stats.bestFinish = Math.min(...positions)
      stats.worstFinish = Math.max(...positions)

      // Calculate percentages
      stats.winPercentage = (stats.wins / stats.totalTournaments) * 100
      stats.topThreePercentage = (stats.topThreeFinishes / stats.totalTournaments) * 100

      // Prepare tournament history with additional context
      stats.tournamentHistory = playerHistoricalStats.map(stat => ({
        tournamentNumber: stat.tournamentNumber,
        finalPosition: stat.finalPosition,
        points: stat.points,
        isWinner: stat.isWinner,
        isSecondPlace: stat.isSecondPlace,
        isThirdPlace: stat.isThirdPlace,
        is7thPlace: stat.is7thPlace,
        is2ndToLast: stat.is2ndToLast,
        notes: stat.notes,
        positionLabel: getPositionLabel(stat.finalPosition),
        achievement: getAchievementType(stat)
      }))
    }

    // Get achievements summary
    const achievements = {
      championships: stats.wins,
      runnerUps: stats.secondPlaces,
      thirdPlaces: stats.thirdPlaces,
      specialPositions: stats.seventhPlaces + stats.secondToLastPlaces,
      consistency: stats.topThreePercentage > 30 ? 'High' : stats.topThreePercentage > 15 ? 'Medium' : 'Low',
      era: getPlayerEra(playerHistoricalStats)
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        achievements,
        rawData: playerHistoricalStats
      }
    })

  })
}

// Helper function to get position label
function getPositionLabel(position: number): string {
  if (position === 1) return 'Campeón'
  if (position === 2) return 'Subcampeón'
  if (position === 3) return 'Tercer Lugar'
  if (position === 7) return '7mo (7/2)'
  return `${position}º`
}

// Helper function to get achievement type
function getAchievementType(stat: any): string {
  if (stat.isWinner) return 'championship'
  if (stat.isSecondPlace) return 'runner-up'
  if (stat.isThirdPlace) return 'third-place'
  if (stat.is7thPlace) return 'seventh-place'
  if (stat.is2ndToLast) return 'second-to-last'
  return 'participation'
}

// Helper function to determine player era
function getPlayerEra(stats: any[]): string {
  if (stats.length === 0) return 'Unknown'
  
  const tournaments = stats.map(s => s.tournamentNumber).sort((a, b) => a - b)
  const firstTournament = tournaments[0]
  const lastTournament = tournaments[tournaments.length - 1]
  
  if (firstTournament <= 5) return 'Founding Era (1-5)'
  if (firstTournament <= 10) return 'Early Era (6-10)'
  if (firstTournament <= 15) return 'Growth Era (11-15)'
  if (firstTournament <= 20) return 'Expansion Era (16-20)'
  if (firstTournament <= 27) return 'Modern Era (21-27)'
  
  return 'Current Era (28+)'
}