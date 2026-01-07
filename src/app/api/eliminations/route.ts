import { NextRequest, NextResponse } from 'next/server';
import { withComisionAuth } from '@/lib/api-auth';
import { bootstrapInfrastructure } from '@/infrastructure/bootstrap';
import { getRegisterEliminationUseCase } from '@/infrastructure';
import { handleEliminationError } from '@/infrastructure/http/errorHandler';

// Ensure dependencies are registered
bootstrapInfrastructure();

/**
 * POST /api/eliminations
 *
 * Registers a new player elimination.
 * Requires Comision role.
 */
export async function POST(request: NextRequest) {
  return withComisionAuth(request, async () => {
    try {
      const body = await request.json();
      const { gameDateId, position, eliminatedPlayerId, eliminatorPlayerId } = body;

      // Basic input validation
      if (!gameDateId || !position || !eliminatedPlayerId) {
        return NextResponse.json(
          { error: 'Missing required fields: gameDateId, position, eliminatedPlayerId' },
          { status: 400 }
        );
      }

      // Execute use case
      const useCase = getRegisterEliminationUseCase();
      const result = await useCase.execute({
        gameDateId,
        position,
        eliminatedPlayerId,
        eliminatorPlayerId: eliminatorPlayerId || null,
      });

      // Return response (compatible with existing frontend)
      return NextResponse.json({
        id: result.id,
        gameDateId: result.gameDateId,
        position: result.position,
        points: result.points,
        eliminatedPlayer: result.eliminatedPlayer,
        eliminatorPlayer: result.eliminatorPlayer,
        eliminationTime: result.eliminationTime,
      });
    } catch (error) {
      return handleEliminationError(error);
    }
  });
}
