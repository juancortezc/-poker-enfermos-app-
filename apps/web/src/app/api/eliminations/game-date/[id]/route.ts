import { NextRequest } from 'next/server';
import { idParamsSchema } from '@poker/shared';
import { withErrorHandler } from '@/lib/errors';
import { ok, parseParams } from '@/lib/http';
import { bootstrapInfrastructure } from '@/infrastructure/bootstrap';
import { getGetEliminationsUseCase } from '@/infrastructure';
import { toEliminationAppError } from '@/infrastructure/http/errorHandler';

// Ensure dependencies are registered
bootstrapInfrastructure();

/**
 * GET /api/eliminations/game-date/[id]
 *
 * Gets all eliminations for a game date, ordered by position descending.
 * Public endpoint (no auth required).
 */
export const GET = withErrorHandler(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id: gameDateId } = parseParams(await params, idParamsSchema);

    try {
      const useCase = getGetEliminationsUseCase();
      const eliminations = await useCase.execute({ gameDateId });
      return ok(eliminations);
    } catch (error) {
      throw toEliminationAppError(error);
    }
  }
);
