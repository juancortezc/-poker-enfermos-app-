import { NextRequest, NextResponse } from 'next/server';
import { bootstrapInfrastructure } from '@/infrastructure/bootstrap';
import { getGetEliminationsUseCase } from '@/infrastructure';
import { handleEliminationError } from '@/infrastructure/http/errorHandler';

// Ensure dependencies are registered
bootstrapInfrastructure();

/**
 * GET /api/eliminations/game-date/[id]
 *
 * Gets all eliminations for a game date, ordered by position descending.
 * Public endpoint (no auth required).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gameDateId = parseInt(id);

    if (isNaN(gameDateId)) {
      return NextResponse.json(
        { error: 'Invalid game date ID' },
        { status: 400 }
      );
    }

    // Execute use case
    const useCase = getGetEliminationsUseCase();
    const eliminations = await useCase.execute({ gameDateId });

    return NextResponse.json(eliminations);
  } catch (error) {
    return handleEliminationError(error);
  }
}
