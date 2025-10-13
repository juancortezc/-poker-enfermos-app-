import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    tournamentId: string
    playerId: string
  }>
}

export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { tournamentId, playerId } = await context.params
    const tournamentIdNum = parseInt(tournamentId)

    if (isNaN(tournamentIdNum)) {
      return NextResponse.json(
        { error: 'ID de torneo inválido' },
        { status: 400 }
      )
    }

    // Get eliminator player
    const eliminator = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photoUrl: true
      }
    })

    if (!eliminator) {
      return NextResponse.json(
        { error: 'Jugador no encontrado' },
        { status: 404 }
      )
    }

    // Get all eliminations by this player in the tournament
    const eliminations = await prisma.elimination.findMany({
      where: {
        eliminatorPlayerId: playerId,
        gameDate: {
          tournamentId: tournamentIdNum
        }
      },
      include: {
        eliminatedPlayer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true
          }
        },
        gameDate: {
          select: {
            id: true,
            dateNumber: true,
            scheduledDate: true
          }
        }
      },
      orderBy: [
        { gameDate: { dateNumber: 'asc' } },
        { position: 'asc' }
      ]
    })

    // Group eliminations by victim
    const victimsMap = new Map<string, {
      player: typeof eliminator
      count: number
      eliminations: Array<{
        dateNumber: number
        scheduledDate: string
        position: number
        gameDateId: number
      }>
    }>()

    eliminations.forEach((elim) => {
      const victimId = elim.eliminatedPlayer.id

      if (!victimsMap.has(victimId)) {
        victimsMap.set(victimId, {
          player: elim.eliminatedPlayer,
          count: 0,
          eliminations: []
        })
      }

      const victim = victimsMap.get(victimId)!
      victim.count++
      victim.eliminations.push({
        dateNumber: elim.gameDate.dateNumber,
        scheduledDate: elim.gameDate.scheduledDate.toISOString(),
        position: elim.position,
        gameDateId: elim.gameDate.id
      })
    })

    // Convert map to array and sort by count (descending)
    const victims = Array.from(victimsMap.values()).sort((a, b) => b.count - a.count)

    return NextResponse.json({
      eliminator,
      totalEliminations: eliminations.length,
      victims
    })
  } catch (error) {
    console.error('Error fetching player eliminations:', error)
    return NextResponse.json(
      { error: 'Error al obtener eliminaciones del jugador' },
      { status: 500 }
    )
  }
}
