import { NextRequest, NextResponse } from 'next/server';
import { bootstrapInfrastructure } from '@/infrastructure/bootstrap';
import { getGetTournamentRankingUseCase } from '@/infrastructure';
import { handleRankingError } from '@/infrastructure/http/rankingErrorHandler';

// Ensure dependencies are registered
bootstrapInfrastructure();

/**
 * GET /api/tournaments/[id]/ranking
 *
 * Gets the complete ranking for a tournament.
 * Public endpoint (no auth required).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id);

    if (isNaN(tournamentId)) {
      return NextResponse.json(
        { error: 'Invalid tournament ID' },
        { status: 400 }
      );
    }

    // Execute use case
    const useCase = getGetTournamentRankingUseCase();
    const rankingData = await useCase.execute({ tournamentId });

    if (!rankingData) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Transform to match existing API response format
    return NextResponse.json({
      tournament: rankingData.tournament,
      rankings: rankingData.rankings,
      lastUpdated: new Date(rankingData.lastUpdated),
    });
  } catch (error) {
    return handleRankingError(error);
  }
}
