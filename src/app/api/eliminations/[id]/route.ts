import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withComisionAuth } from '@/lib/api-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(request, async (_req, _user) => {
    try {
    const { id } = await params;
    const eliminationId = parseInt(id);
    const body = await request.json();
    const { eliminatedId, eliminatorId } = body;

    // Obtener la eliminación actual
    const currentElimination = await prisma.elimination.findUnique({
      where: { id: eliminationId },
      include: {
        gameDate: true
      }
    });

    if (!currentElimination) {
      return NextResponse.json(
        { error: 'Elimination not found' },
        { status: 404 }
      );
    }

    // No permitir cambiar la posición ni los puntos
    if (body.position !== undefined || body.points !== undefined) {
      return NextResponse.json(
        { error: 'Cannot change position or points' },
        { status: 400 }
      );
    }

    // Verificar que la fecha está en progreso
    if (currentElimination.gameDate.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Cannot edit elimination - game date is not in progress' },
        { status: 400 }
      );
    }

    // Validar que el nuevo jugador eliminado no haya sido eliminado ya
    if (eliminatedId && eliminatedId !== currentElimination.eliminatedPlayerId) {
      const existingElimination = await prisma.elimination.findFirst({
        where: {
          gameDateId: currentElimination.gameDateId,
          eliminatedPlayerId: eliminatedId,
          id: { not: eliminationId }
        }
      });

      if (existingElimination) {
        return NextResponse.json(
          { error: 'Player already eliminated' },
          { status: 400 }
        );
      }
    }

    // Validar que el eliminador no haya sido eliminado antes de esta posición
    if (eliminatorId) {
      const eliminatorEliminated = await prisma.elimination.findFirst({
        where: {
          gameDateId: currentElimination.gameDateId,
          eliminatedPlayerId: eliminatorId,
          position: { gt: currentElimination.position }
        }
      });

      if (eliminatorEliminated) {
        return NextResponse.json(
          { error: 'Eliminator has already been eliminated' },
          { status: 400 }
        );
      }
    }

    // Actualizar la eliminación
    const updatedElimination = await prisma.elimination.update({
      where: { id: eliminationId },
      data: {
        eliminatedPlayerId: eliminatedId || currentElimination.eliminatedPlayerId,
        eliminatorPlayerId: eliminatorId !== undefined ? eliminatorId : currentElimination.eliminatorPlayerId
      },
      include: {
        eliminatedPlayer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        eliminatorPlayer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

      return NextResponse.json(updatedElimination);
    } catch (error) {
      console.error('Error updating elimination:', error);
      return NextResponse.json(
        { error: 'Failed to update elimination' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(request, async (_req, _user) => {
    try {
    const { id } = await params;
    const eliminationId = parseInt(id);

    // Obtener la eliminación
    const elimination = await prisma.elimination.findUnique({
      where: { id: eliminationId },
      include: {
        gameDate: true
      }
    });

    if (!elimination) {
      return NextResponse.json(
        { error: 'Elimination not found' },
        { status: 404 }
      );
    }

    // Solo permitir eliminar si la fecha está en progreso
    if (elimination.gameDate.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Cannot delete elimination - game date is not in progress' },
        { status: 400 }
      );
    }

    // Verificar que no hay eliminaciones con posición menor (que ocurrieron después)
    const laterEliminations = await prisma.elimination.findFirst({
      where: {
        gameDateId: elimination.gameDateId,
        position: { lt: elimination.position }
      }
    });

    if (laterEliminations) {
      return NextResponse.json(
        { error: 'Cannot delete - there are eliminations that occurred after this one' },
        { status: 400 }
      );
    }

    // Eliminar
    await prisma.elimination.delete({
      where: { id: eliminationId }
    });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting elimination:', error);
      return NextResponse.json(
        { error: 'Failed to delete elimination' },
        { status: 500 }
      );
    }
  });
}