import { NextRequest } from 'next/server';
import { registerEliminationSchema } from '@poker/shared';
import { requireComision } from '@/lib/api-auth';
import { withErrorHandler } from '@/lib/errors';
import { ok, parseBody } from '@/lib/http';
import { bootstrapInfrastructure } from '@/infrastructure/bootstrap';
import { getRegisterEliminationUseCase } from '@/infrastructure';
import { toEliminationAppError } from '@/infrastructure/http/errorHandler';

// Ensure dependencies are registered
bootstrapInfrastructure();

/**
 * POST /api/eliminations
 *
 * Registers a new player elimination.
 * Requires Comision role.
 *
 * Errores con `code`: 422 VALIDATION_ERROR (body mal formado),
 * 400 SELF_ELIMINATION / PLAYER_NOT_IN_GAME_DATE / INVALID_POSITION / INVALID_ELIMINATOR,
 * 404 NOT_FOUND, 409 POSITION_ALREADY_TAKEN / POSITION_NOT_NEXT /
 * PLAYER_ALREADY_ELIMINATED / GAME_DATE_NOT_IN_PROGRESS / ELIMINATION_CONFLICT.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireComision(request);
  const input = await parseBody(request, registerEliminationSchema);

  try {
    const useCase = getRegisterEliminationUseCase();
    const result = await useCase.execute(input);

    // Return response (compatible with existing frontend)
    return ok({
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
    throw toEliminationAppError(error);
  }
});
