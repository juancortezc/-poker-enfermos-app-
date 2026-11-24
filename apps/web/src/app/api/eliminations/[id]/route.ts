import { NextRequest, NextResponse } from 'next/server';
import { withComisionAuth } from '@/lib/api-auth';
import { bootstrapInfrastructure } from '@/infrastructure/bootstrap';
import {
  getUpdateEliminationUseCase,
  getDeleteEliminationUseCase,
} from '@/infrastructure';
import { handleEliminationError } from '@/infrastructure/http/errorHandler';
import { parseEliminationId, parseUpdateElimination } from '@/infrastructure/http/eliminationInput';
import { recalculateStatsForElimination, recalculateAllStats } from '@/lib/parent-child-stats';
import { prisma } from '@/lib/prisma';

// Ensure dependencies are registered
bootstrapInfrastructure();

/**
 * PUT /api/eliminations/[id]
 *
 * Updates an existing elimination (only player assignments, not position/points).
 * Requires Comision role.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(request, async () => {
    try {
      const eliminationId = parseEliminationId((await params).id);
      const { eliminatedPlayerId, eliminatorPlayerId } = await parseUpdateElimination(request);

      // Execute use case
      const useCase = getUpdateEliminationUseCase();
      const result = await useCase.execute({
        eliminationId,
        eliminatedPlayerId,
        eliminatorPlayerId,
      });

      // Cambiar quien elimino a quien mueve las relaciones P&H. Sin esto el
      // contador se quedaba con la version vieja para siempre.
      await recalculateStatsForElimination(eliminationId);

      return NextResponse.json(result);
    } catch (error) {
      return handleEliminationError(error);
    }
  });
}

/**
 * DELETE /api/eliminations/[id]
 *
 * Deletes an elimination (only the most recent one can be deleted).
 * Requires Comision role.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(request, async () => {
    try {
      const eliminationId = parseEliminationId((await params).id);

      // Execute use case
      // Se lee el torneo ANTES de borrar: despues la eliminacion ya no existe.
      const tournamentId = await tournamentIdOfElimination(eliminationId);

      const useCase = getDeleteEliminationUseCase();
      await useCase.execute({ eliminationId });

      if (tournamentId) {
        await recalculateAllStats(tournamentId);
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleEliminationError(error);
    }
  });
}

/** Torneo al que pertenece una eliminacion, leido antes de borrarla. */
async function tournamentIdOfElimination(eliminationId: number): Promise<number | null> {
  const row = await prisma.elimination.findUnique({
    where: { id: eliminationId },
    select: { gameDate: { select: { tournamentId: true } } },
  });
  return row?.gameDate?.tournamentId ?? null;
}
