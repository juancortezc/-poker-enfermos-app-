import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/players/[id]/podium-details
 * Obtener estadísticas detalladas de podios de un jugador específico
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const playerId = id

    // Verificar que el jugador existe
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

    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Jugador no encontrado' },
        { status: 404 }
      )
    }

    // Obtener todas las posiciones del jugador
    const allWinners = await prisma.tournamentWinners.findMany({
      where: {
        OR: [
          { championId: playerId },
          { runnerUpId: playerId },
          { thirdPlaceId: playerId },
          { sieteId: playerId },
          { dosId: playerId }
        ]
      },
      select: {
        tournamentNumber: true,
        championId: true,
        runnerUpId: true,
        thirdPlaceId: true,
        sieteId: true,
        dosId: true
      },
      orderBy: {
        tournamentNumber: 'asc'
      }
    })

    // Contar posiciones
    let firstPlaces = 0
    let secondPlaces = 0
    let thirdPlaces = 0
    let sietePositions = 0
    let dosPositions = 0
    const tournamentDetails: Array<{
      tournamentNumber: number
      position: 'champion' | 'runnerUp' | 'thirdPlace' | 'siete' | 'dos'
      positionText: string
    }> = []

    allWinners.forEach(winner => {
      if (winner.championId === playerId) {
        firstPlaces++
        tournamentDetails.push({
          tournamentNumber: winner.tournamentNumber,
          position: 'champion',
          positionText: '1º Lugar (Campeón)'
        })
      }
      if (winner.runnerUpId === playerId) {
        secondPlaces++
        tournamentDetails.push({
          tournamentNumber: winner.tournamentNumber,
          position: 'runnerUp',
          positionText: '2º Lugar (Subcampeón)'
        })
      }
      if (winner.thirdPlaceId === playerId) {
        thirdPlaces++
        tournamentDetails.push({
          tournamentNumber: winner.tournamentNumber,
          position: 'thirdPlace',
          positionText: '3º Lugar'
        })
      }
      if (winner.sieteId === playerId) {
        sietePositions++
        tournamentDetails.push({
          tournamentNumber: winner.tournamentNumber,
          position: 'siete',
          positionText: 'Siete (Penúltimo)'
        })
      }
      if (winner.dosId === playerId) {
        dosPositions++
        tournamentDetails.push({
          tournamentNumber: winner.tournamentNumber,
          position: 'dos',
          positionText: 'Dos (Último)'
        })
      }
    })

    const totalPodiums = firstPlaces + secondPlaces + thirdPlaces
    const totalAppearances = totalPodiums + sietePositions + dosPositions

    return NextResponse.json({
      success: true,
      data: {
        player,
        statistics: {
          firstPlaces,
          secondPlaces,
          thirdPlaces,
          sietePositions,
          dosPositions,
          totalPodiums,
          totalAppearances
        },
        tournamentDetails: tournamentDetails.sort((a, b) => b.tournamentNumber - a.tournamentNumber),
        summary: {
          bestPosition: firstPlaces > 0 ? 'Campeón' : secondPlaces > 0 ? 'Subcampeón' : thirdPlaces > 0 ? '3º Lugar' : sietePositions > 0 ? 'Siete' : 'Dos',
          totalTournaments: tournamentDetails.length,
          podiumRate: tournamentDetails.length > 0 ? Math.round((totalPodiums / tournamentDetails.length) * 100) : 0
        }
      }
    })

  } catch (error) {
    console.error('Error fetching player podium details:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error fetching player podium details' 
      },
      { status: 500 }
    )
  }
}