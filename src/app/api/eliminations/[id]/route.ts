import { NextRequest, NextResponse } from 'next/server';
import { withComisionAuth } from '@/lib/api-auth';
import { bootstrapInfrastructure } from '@/infrastructure/bootstrap';
import {
  getUpdateEliminationUseCase,
  getDeleteEliminationUseCase,
} from '@/infrastructure';
import { handleEliminationError } from '@/infrastructure/http/errorHandler';

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
      const { id } = await params;
      const eliminationId = parseInt(id);

      if (isNaN(eliminationId)) {
        return NextResponse.json(
          { error: 'Invalid elimination ID' },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Support both naming conventions from frontend
      const eliminatedPlayerId = body.eliminatedPlayerId ?? body.eliminatedId;
      const eliminatorPlayerId = body.eliminatorPlayerId ?? body.eliminatorId;

      // Reject attempts to change position or points
      if (body.position !== undefined || body.points !== undefined) {
        return NextResponse.json(
          { error: 'Cannot change position or points' },
          { status: 400 }
        );
      }

      // Execute use case
      const useCase = getUpdateEliminationUseCase();
      const result = await useCase.execute({
        eliminationId,
        eliminatedPlayerId,
        eliminatorPlayerId,
      });

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
      const { id } = await params;
      const eliminationId = parseInt(id);

      if (isNaN(eliminationId)) {
        return NextResponse.json(
          { error: 'Invalid elimination ID' },
          { status: 400 }
        );
      }

      // Execute use case
      const useCase = getDeleteEliminationUseCase();
      await useCase.execute({ eliminationId });

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleEliminationError(error);
    }
  });
}
