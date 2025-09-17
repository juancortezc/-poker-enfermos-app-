import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withComisionAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// GET /api/stats/historical - Get overall historical statistics
export async function GET(request: NextRequest) {
  return withAuth(request, async (request, user) => {

    // Get all historical tournament statistics
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

    // Calculate summary statistics
    const summary = {
      totalTournaments: new Set(historicalStats.map(stat => stat.tournamentNumber)).size,
      totalPlayers: new Set(historicalStats.map(stat => stat.playerId)).size,
      tournamentWinners: historicalStats.filter(stat => stat.isWinner),
      tournamentsByNumber: {} as Record<number, any[]>
    }

    // Group by tournament number
    historicalStats.forEach(stat => {
      if (!summary.tournamentsByNumber[stat.tournamentNumber]) {
        summary.tournamentsByNumber[stat.tournamentNumber] = []
      }
      summary.tournamentsByNumber[stat.tournamentNumber].push(stat)
    })

    // Calculate player statistics
    const playerStats = {} as Record<string, {
      playerId: string
      playerName: string
      wins: number
      secondPlaces: number
      thirdPlaces: number
      seventhPlaces: number
      secondToLastPlaces: number
      totalTournaments: number
      winPercentage: number
      topThreePercentage: number
      averagePosition: number
    }>

    historicalStats.forEach(stat => {
      if (!playerStats[stat.playerId]) {
        playerStats[stat.playerId] = {
          playerId: stat.playerId,
          playerName: `${stat.player.firstName} ${stat.player.lastName}`,
          wins: 0,
          secondPlaces: 0,
          thirdPlaces: 0,
          seventhPlaces: 0,
          secondToLastPlaces: 0,
          totalTournaments: 0,
          winPercentage: 0,
          topThreePercentage: 0,
          averagePosition: 0
        }
      }

      const playerStat = playerStats[stat.playerId]
      playerStat.totalTournaments++

      if (stat.isWinner) playerStat.wins++
      if (stat.isSecondPlace) playerStat.secondPlaces++
      if (stat.isThirdPlace) playerStat.thirdPlaces++
      if (stat.is7thPlace) playerStat.seventhPlaces++
      if (stat.is2ndToLast) playerStat.secondToLastPlaces++

      // Update percentages and averages
      playerStat.winPercentage = (playerStat.wins / playerStat.totalTournaments) * 100
      playerStat.topThreePercentage = ((playerStat.wins + playerStat.secondPlaces + playerStat.thirdPlaces) / playerStat.totalTournaments) * 100
    })

    // Calculate average positions
    Object.keys(playerStats).forEach(playerId => {
      const playerPositions = historicalStats
        .filter(stat => stat.playerId === playerId)
        .map(stat => stat.finalPosition)
      
      if (playerPositions.length > 0) {
        playerStats[playerId].averagePosition = 
          playerPositions.reduce((sum, pos) => sum + pos, 0) / playerPositions.length
      }
    })

    // Convert player stats to array and sort by wins
    const sortedPlayerStats = Object.values(playerStats).sort((a, b) => b.wins - a.wins)

    return NextResponse.json({
      success: true,
      data: {
        summary,
        playerStats: sortedPlayerStats,
        rawData: historicalStats
      }
    })

  })
}

// POST /api/stats/historical - Import historical data (Admin only)
export async function POST(request: NextRequest) {
  return withComisionAuth(request, async (request, user) => {

    const body = await request.json()
    const { records } = body

    if (!Array.isArray(records)) {
      return NextResponse.json({ error: 'Se requiere un array de registros' }, { status: 400 })
    }

    const importResults = {
      created: 0,
      updated: 0,
      errors: [] as string[]
    }

    // Process each record
    for (const record of records) {
      try {
        const {
          tournamentNumber,
          playerId,
          finalPosition,
          points,
          notes
        } = record

        // Validate required fields
        if (!tournamentNumber || !playerId || !finalPosition) {
          importResults.errors.push(`Record missing required fields: ${JSON.stringify(record)}`)
          continue
        }

        // Verify player exists
        const player = await prisma.player.findUnique({
          where: { id: playerId }
        })

        if (!player) {
          importResults.errors.push(`Player not found: ${playerId}`)
          continue
        }

        // Calculate position flags
        const isWinner = finalPosition === 1
        const isSecondPlace = finalPosition === 2
        const isThirdPlace = finalPosition === 3

        // Create or update historical stat
        const existingRecord = await prisma.historicalTournamentStats.findUnique({
          where: {
            tournamentNumber_playerId: {
              tournamentNumber,
              playerId
            }
          }
        })

        if (existingRecord) {
          await prisma.historicalTournamentStats.update({
            where: { id: existingRecord.id },
            data: {
              finalPosition,
              points,
              isWinner,
              isSecondPlace,
              isThirdPlace,
              notes,
              updatedAt: new Date()
            }
          })
          importResults.updated++
        } else {
          await prisma.historicalTournamentStats.create({
            data: {
              tournamentNumber,
              playerId,
              finalPosition,
              points,
              isWinner,
              isSecondPlace,
              isThirdPlace,
              notes
            }
          })
          importResults.created++
        }

      } catch (recordError) {
        importResults.errors.push(`Error processing record: ${JSON.stringify(record)} - ${recordError}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: importResults
    })

  })
}