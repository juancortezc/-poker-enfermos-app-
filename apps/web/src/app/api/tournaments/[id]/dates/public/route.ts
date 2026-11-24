import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/tournaments/:id/dates/public - Obtener fechas públicas del torneo
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tournamentId = parseInt((await params).id)

    if (isNaN(tournamentId)) {
      return NextResponse.json(
        { error: 'Invalid tournament ID' },
        { status: 400 }
      )
    }

    // Obtener fechas del torneo con información básica
    const dates = await prisma.gameDate.findMany({
      where: {
        tournamentId: tournamentId
      },
      select: {
        id: true,
        dateNumber: true,
        status: true,
        scheduledDate: true,
        playerIds: true // Needed to count participants
      },
      orderBy: {
        dateNumber: 'asc'
      }
    })

    return NextResponse.json(dates)
  } catch (error) {
    console.error('Error fetching tournament dates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tournament dates' },
      { status: 500 }
    )
  }
}