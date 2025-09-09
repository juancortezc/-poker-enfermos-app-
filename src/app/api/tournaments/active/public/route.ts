import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/tournaments/active/public - Obtener el torneo activo (endpoint público)
export async function GET() {
  try {
    const activeTournament = await prisma.tournament.findFirst({
      where: { status: 'ACTIVO' },
      select: {
        id: true,
        name: true,
        number: true,
        status: true,
        _count: {
          select: {
            tournamentParticipants: true,
            gameDates: true
          }
        }
      }
    })

    if (!activeTournament) {
      return NextResponse.json({ tournament: null })
    }

    return NextResponse.json({
      tournament: activeTournament
    })
  } catch (error) {
    console.error('Error fetching active tournament:', error)
    return NextResponse.json(
      { error: 'Error al obtener torneo activo' },
      { status: 500 }
    )
  }
}