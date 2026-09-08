import { NextRequest, NextResponse } from 'next/server'
import { computeTournamentAwards } from '@/lib/awards-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params
    const tournamentIdNum = parseInt(tournamentId)

    const response = await computeTournamentAwards(tournamentIdNum)

    if (!response) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching awards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch awards' },
      { status: 500 }
    )
  }
}
