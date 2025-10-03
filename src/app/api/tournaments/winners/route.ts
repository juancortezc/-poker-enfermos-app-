import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTournamentWinnersWithFallback } from '@/lib/tournament-winners'

/**
 * GET /api/tournaments/winners
 * Obtener todos los ganadores históricos de torneos
 */
export async function GET() {
  try {
    const winners = await getTournamentWinnersWithFallback(prisma)

    return NextResponse.json({
      success: true,
      data: winners,
      total: winners.length
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
