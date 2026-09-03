import { NextRequest, NextResponse } from 'next/server'
import { calculateTournamentInsights } from '@/lib/ranking-utils'

// GET /api/tournaments/[id]/insights - Rachas y récords de temporada (público)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tournamentId = parseInt((await params).id)

    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'ID de torneo inválido' }, { status: 400 })
    }

    const insights = await calculateTournamentInsights(tournamentId)

    if (!insights) {
      return NextResponse.json({
        streaks: { hot: [], cold: [] },
        seasonHighlights: { biggestJump: null, longestTop3Streak: null }
      })
    }

    return NextResponse.json(insights)
  } catch (error) {
    console.error('Error fetching tournament insights:', error)
    return NextResponse.json({ error: 'Error al obtener insights del torneo' }, { status: 500 })
  }
}
