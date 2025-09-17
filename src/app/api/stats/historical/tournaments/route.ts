import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// GET /api/stats/historical/tournaments - Get list of historical tournaments with summary
export async function GET(request: NextRequest) {
  return withAuth(request, async (request, user) => {

    // Get all historical tournament statistics grouped by tournament
    const historicalStats = await prisma.historicalTournamentStats.findMany({
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true
          }
        }
      },
      orderBy: [
        { tournamentNumber: 'asc' },
        { finalPosition: 'asc' }
      ]
    })

    // Group by tournament number
    const tournamentMap = new Map<number, any>()

    historicalStats.forEach(stat => {
      const tournamentNumber = stat.tournamentNumber
      
      if (!tournamentMap.has(tournamentNumber)) {
        tournamentMap.set(tournamentNumber, {
          tournamentNumber,
          name: `Torneo ${tournamentNumber}`,
          participants: [],
          winner: null,
          runnerUp: null,
          thirdPlace: null,
          seventhPlace: null,
          secondToLast: null,
          totalParticipants: 0,
          dataCompleteness: 'unknown'
        })
      }

      const tournament = tournamentMap.get(tournamentNumber)!
      
      // Add participant
      tournament.participants.push({
        playerId: stat.playerId,
        playerName: `${stat.player.firstName} ${stat.player.lastName}`,
        finalPosition: stat.finalPosition,
        points: stat.points,
        isWinner: stat.isWinner,
        isSecondPlace: stat.isSecondPlace,
        isThirdPlace: stat.isThirdPlace,
        is7thPlace: stat.is7thPlace,
        is2ndToLast: stat.is2ndToLast,
        notes: stat.notes
      })

      // Set special positions
      if (stat.isWinner) {
        tournament.winner = {
          playerId: stat.playerId,
          playerName: `${stat.player.firstName} ${stat.player.lastName}`,
          points: stat.points
        }
      }
      
      if (stat.isSecondPlace) {
        tournament.runnerUp = {
          playerId: stat.playerId,
          playerName: `${stat.player.firstName} ${stat.player.lastName}`,
          points: stat.points
        }
      }
      
      if (stat.isThirdPlace) {
        tournament.thirdPlace = {
          playerId: stat.playerId,
          playerName: `${stat.player.firstName} ${stat.player.lastName}`,
          points: stat.points
        }
      }

      if (stat.is7thPlace) {
        tournament.seventhPlace = {
          playerId: stat.playerId,
          playerName: `${stat.player.firstName} ${stat.player.lastName}`,
          points: stat.points
        }
      }

      if (stat.is2ndToLast) {
        tournament.secondToLast = {
          playerId: stat.playerId,
          playerName: `${stat.player.firstName} ${stat.player.lastName}`,
          points: stat.points
        }
      }
    })

    // Process tournaments and determine data completeness
    const tournaments = Array.from(tournamentMap.values()).map(tournament => {
      tournament.totalParticipants = tournament.participants.length
      
      // Determine data completeness
      if (tournament.winner && tournament.runnerUp && tournament.thirdPlace) {
        if (tournament.totalParticipants >= 7) {
          tournament.dataCompleteness = 'complete'
        } else {
          tournament.dataCompleteness = 'partial'
        }
      } else if (tournament.winner) {
        tournament.dataCompleteness = 'minimal'
      } else {
        tournament.dataCompleteness = 'incomplete'
      }

      // Sort participants by position
      tournament.participants.sort((a: any, b: any) => a.finalPosition - b.finalPosition)

      return tournament
    })

    // Calculate summary statistics
    const summary = {
      totalHistoricalTournaments: tournaments.length,
      completeTournaments: tournaments.filter(t => t.dataCompleteness === 'complete').length,
      partialTournaments: tournaments.filter(t => t.dataCompleteness === 'partial').length,
      minimalTournaments: tournaments.filter(t => t.dataCompleteness === 'minimal').length,
      incompleteTournaments: tournaments.filter(t => t.dataCompleteness === 'incomplete').length,
      totalParticipants: new Set(historicalStats.map(stat => stat.playerId)).size,
      averageParticipantsPerTournament: tournaments.length > 0 ? 
        tournaments.reduce((sum, t) => sum + t.totalParticipants, 0) / tournaments.length : 0,
      tournamentRange: tournaments.length > 0 ? 
        `Torneo ${Math.min(...tournaments.map(t => t.tournamentNumber))} - Torneo ${Math.max(...tournaments.map(t => t.tournamentNumber))}` : 
        'No data'
    }

    // Get champions list
    const champions = tournaments
      .filter(t => t.winner)
      .map(t => ({
        tournamentNumber: t.tournamentNumber,
        winner: t.winner
      }))
      .sort((a, b) => a.tournamentNumber - b.tournamentNumber)

    // Get multiple winners (players with more than one championship)
    const championCounts = new Map<string, number>()
    champions.forEach(c => {
      const count = championCounts.get(c.winner.playerId) || 0
      championCounts.set(c.winner.playerId, count + 1)
    })

    const multipleChampions = Array.from(championCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([playerId, count]) => {
        const champion = champions.find(c => c.winner.playerId === playerId)
        return {
          playerId,
          playerName: champion?.winner.playerName || 'Unknown',
          championshipsCount: count,
          tournaments: champions
            .filter(c => c.winner.playerId === playerId)
            .map(c => c.tournamentNumber)
        }
      })
      .sort((a, b) => b.championshipsCount - a.championshipsCount)

    return NextResponse.json({
      success: true,
      data: {
        summary,
        tournaments: tournaments.sort((a, b) => a.tournamentNumber - b.tournamentNumber),
        champions,
        multipleChampions
      }
    })

  })
}