import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    // Get all game dates with basic info
    const gameDates = await prisma.gameDate.findMany({
      where: {
        tournamentId: 1 // Torneo 28
      },
      select: {
        id: true,
        dateNumber: true,
        status: true,
        scheduledDate: true,
        startTime: true,
        playerIds: true,
        playersMin: true,
        playersMax: true
      },
      orderBy: {
        dateNumber: 'asc'
      }
    })

    // Get tournament info
    const tournament = await prisma.tournament.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        number: true,
        status: true
      }
    })

    // Get related data for GameDates 11 and 12
    const gameDate11Data = await prisma.gameDate.findFirst({
      where: { dateNumber: 11, tournamentId: 1 },
      include: {
        eliminations: true,
        timerStates: true
      }
    })

    const gameDate12Data = await prisma.gameDate.findFirst({
      where: { dateNumber: 12, tournamentId: 1 },
      include: {
        eliminations: true,
        timerStates: true
      }
    })

    return NextResponse.json({
      tournament,
      totalGameDates: gameDates.length,
      gameDates: gameDates.map(gd => ({
        ...gd,
        playersCount: gd.playerIds.length,
        scheduledDateFormatted: gd.scheduledDate.toISOString().split('T')[0]
      })),
      gameDate11: gameDate11Data ? {
        ...gameDate11Data,
        eliminationsCount: gameDate11Data.eliminations.length,
        timerStatesCount: gameDate11Data.timerStates.length
      } : null,
      gameDate12: gameDate12Data ? {
        ...gameDate12Data,
        eliminationsCount: gameDate12Data.eliminations.length,
        timerStatesCount: gameDate12Data.timerStates.length
      } : null
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Error getting debug info', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}