import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTournamentWinnerByNumber } from '@/lib/tournament-winners'

/**
 * GET /api/tournaments/[number]/winners
 * Obtener ganadores de un torneo específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params
    const tournamentNumber = parseInt(number)
    
    if (isNaN(tournamentNumber)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid tournament number' 
        },
        { status: 400 }
      )
    }

    const winners = await getTournamentWinnerByNumber(prisma, tournamentNumber)

    if (!winners) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Tournament ${tournamentNumber} not found` 
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: winners
    })

  } catch (error) {
    console.error('Error fetching tournament winners:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error fetching tournament winners' 
      },
      { status: 500 }
    )
  }
}
