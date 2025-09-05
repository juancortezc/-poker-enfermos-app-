import { NextRequest, NextResponse } from 'next/server';
import { calculateTournamentRanking } from '@/lib/ranking-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = parseInt(params.id);

    if (isNaN(tournamentId)) {
      return NextResponse.json(
        { error: 'Invalid tournament ID' },
        { status: 400 }
      );
    }

    // Calcular el ranking completo del torneo
    const rankingData = await calculateTournamentRanking(tournamentId);

    if (!rankingData) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(rankingData);
  } catch (error) {
    console.error('Error fetching tournament ranking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament ranking' },
      { status: 500 }
    );
  }
}