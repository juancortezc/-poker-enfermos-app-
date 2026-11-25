import { NextRequest } from 'next/server';
import { idParamsSchema, updateEliminationSchema } from '@poker/shared';
import { requireComision } from '@/lib/api-auth';
import { withErrorHandler } from '@/lib/errors';
import { ok, parseBody, parseParams } from '@/lib/http';
import { bootstrapInfrastructure } from '@/infrastructure/bootstrap';
import {
  getUpdateEliminationUseCase,
  getDeleteEliminationUseCase,
} from '@/infrastructure';
import { toEliminationAppError } from '@/infrastructure/http/errorHandler';
import { recalculateStatsForElimination, recalculateAllStats } from '@/lib/parent-child-stats';
import { prisma } from '@/lib/prisma';

// Ensure dependencies are registered
bootstrapInfrastructure();

type Ctx = { params: Promise<{ id: string }> };

/**
 * PUT /api/eliminations/[id]
 *
 * Updates an existing elimination (only player assignments, not position/points).
 * Requires Comision role.
 */
export const PUT = withErrorHandler(async (request: NextRequest, { params }: Ctx) => {
  await requireComision(request);
  const { id: eliminationId } = parseParams(await params, idParamsSchema);
  const { eliminatedPlayerId, eliminatorPlayerId } = await parseBody(request, updateEliminationSchema);

  try {
    const useCase = getUpdateEliminationUseCase();
    const result = await useCase.execute({
      eliminationId,
      eliminatedPlayerId,
      eliminatorPlayerId,
    });

    // Cambiar quien elimino a quien mueve las relaciones P&H. Sin esto el
    // contador se quedaba con la version vieja para siempre.
    await recalculateStatsForElimination(eliminationId);

    return ok(result);
  } catch (error) {
    throw toEliminationAppError(error);
  }
});

/**
 * DELETE /api/eliminations/[id]
 *
 * Deletes an elimination (only the most recent one can be deleted).
 * Requires Comision role.
 */
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: Ctx) => {
  await requireComision(request);
  const { id: eliminationId } = parseParams(await params, idParamsSchema);

  try {
    // Se lee el torneo ANTES de borrar: despues la eliminacion ya no existe.
    const tournamentId = await tournamentIdOfElimination(eliminationId);

    const useCase = getDeleteEliminationUseCase();
    await useCase.execute({ eliminationId });

    if (tournamentId) {
      await recalculateAllStats(tournamentId);
    }

    return ok(null);
  } catch (error) {
    throw toEliminationAppError(error);
  }
});

/** Torneo al que pertenece una eliminacion, leido antes de borrarla. */
async function tournamentIdOfElimination(eliminationId: number): Promise<number | null> {
  const row = await prisma.elimination.findUnique({
    where: { id: eliminationId },
    select: { gameDate: { select: { tournamentId: true } } },
  });
  return row?.gameDate?.tournamentId ?? null;
}
