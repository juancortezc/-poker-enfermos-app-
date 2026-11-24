import { NextRequest, NextResponse } from 'next/server';
import { withComisionAuth } from '@/lib/api-auth';
import { bootstrapInfrastructure } from '@/infrastructure/bootstrap';
import { getRegisterEliminationUseCase } from '@/infrastructure';
import { handleEliminationError } from '@/infrastructure/http/errorHandler';
import { parseRegisterElimination } from '@/infrastructure/http/eliminationInput';

// Ensure dependencies are registered
bootstrapInfrastructure();

/**
 * POST /api/eliminations
 *
 * Registers a new player elimination.
 * Requires Comision role.
 *
 * Errores con `code`: 400 INVALID_INPUT / SELF_ELIMINATION /
 * PLAYER_NOT_IN_GAME_DATE / INVALID_POSITION / INVALID_ELIMINATOR,
 * 404 NOT_FOUND, 409 POSITION_ALREADY_TAKEN / POSITION_NOT_NEXT /
 * PLAYER_ALREADY_ELIMINATED / GAME_DATE_NOT_IN_PROGRESS / ELIMINATION_CONFLICT.
 */
export async function POST(request: NextRequest) {
  return withComisionAuth(request, async () => {
    try {
      const input = await parseRegisterElimination(request);

      const useCase = getRegisterEliminationUseCase();
      const result = await useCase.execute(input);

      // Return response (compatible with existing frontend)
      return NextResponse.json({
        id: result.id,
        gameDateId: result.gameDateId,
        position: result.position,
        points: result.points,
        eliminatedPlayer: result.eliminatedPlayer,
        eliminatorPlayer: result.eliminatorPlayer,
        eliminationTime: result.eliminationTime,
        triggeredAutoComplete: result.triggeredAutoComplete,
        autoCompleteError: result.autoCompleteError,
        winnerElimination: result.winnerElimination,
      });
    } catch (error) {
      return handleEliminationError(error);
    }
  });
}
