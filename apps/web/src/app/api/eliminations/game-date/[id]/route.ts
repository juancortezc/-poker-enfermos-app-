import { NextRequest } from 'next/server';
import { idParamsSchema, withTournamentPhotos } from '@poker/shared';
import { prisma } from '@/lib/prisma';
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
 *
 * Las fotos son las del torneo de la fecha: en una fecha anterior al T31 va la
 * foto de entonces, no la de lucha libre (withTournamentPhotos).
 */
export const GET = withErrorHandler(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id: gameDateId } = parseParams(await params, idParamsSchema);

    try {
      const useCase = getGetEliminationsUseCase();
      const [eliminations, gameDate] = await Promise.all([
        useCase.execute({ gameDateId }),
        prisma.gameDate.findUnique({ where: { id: gameDateId }, select: { tournament: { select: { number: true } } } }),
      ]);
      return ok(withTournamentPhotos(eliminations, gameDate?.tournament.number));
    } catch (error) {
      throw toEliminationAppError(error);
    }
  }
);
