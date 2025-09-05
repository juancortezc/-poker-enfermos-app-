import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withComisionAuth } from '@/lib/api-auth';
import { calculatePointsForPosition } from '@/lib/tournament-utils';

export async function POST(request: NextRequest) {
  return withComisionAuth(request, async (req, user) => {
    try {
      const body = await request.json();
    const { gameDateId, position, eliminatedId, eliminatorId } = body;

    // Validaciones
    if (!gameDateId || !position || !eliminatedId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verificar que la fecha existe y está activa
    const gameDate = await prisma.gameDate.findUnique({
      where: { id: gameDateId },
      include: {
        tournament: true
      }
    });

    if (!gameDate) {
      return NextResponse.json(
        { error: 'Game date not found' },
        { status: 404 }
      );
    }

    if (gameDate.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Game date is not in progress' },
        { status: 400 }
      );
    }

    // Verificar que el jugador no haya sido eliminado ya
    const existingElimination = await prisma.elimination.findFirst({
      where: {
        gameDateId,
        eliminatedPlayerId: eliminatedId
      }
    });

    if (existingElimination) {
      return NextResponse.json(
        { error: 'Player already eliminated' },
        { status: 400 }
      );
    }

    // Verificar que no exista una eliminación en esa posición
    const positionTaken = await prisma.elimination.findFirst({
      where: {
        gameDateId,
        position
      }
    });

    if (positionTaken) {
      return NextResponse.json(
        { error: 'Position already taken' },
        { status: 400 }
      );
    }

    // Si hay eliminador, verificar que no haya sido eliminado
    if (eliminatorId) {
      const eliminatorEliminated = await prisma.elimination.findFirst({
        where: {
          gameDateId,
          eliminatedPlayerId: eliminatorId,
          position: { gt: position } // Eliminado en una posición mayor (antes)
        }
      });

      if (eliminatorEliminated) {
        return NextResponse.json(
          { error: 'Eliminator has already been eliminated' },
          { status: 400 }
        );
      }
    }

    // Calcular puntos basado en la cantidad de jugadores
    const totalPlayers = gameDate.playerIds.length;
    const points = calculatePointsForPosition(position, totalPlayers);

    // Crear la eliminación
    const elimination = await prisma.elimination.create({
      data: {
        gameDateId,
        position,
        eliminatedPlayerId: eliminatedId,
        eliminatorPlayerId: eliminatorId,
        points,
        eliminationTime: new Date().toISOString()
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

    // Si llegamos a la posición 2, auto-completar la fecha
    if (position === 2 && eliminatorId) {
      // Crear la eliminación del ganador (posición 1)
      const winnerPoints = calculatePointsForPosition(1, totalPlayers);
      
      await prisma.elimination.create({
        data: {
          gameDateId,
          position: 1,
          eliminatedPlayerId: eliminatorId,
          eliminatorPlayerId: null,
          points: winnerPoints,
          eliminationTime: new Date().toISOString()
        }
      });

      // Marcar la fecha como completada
      await prisma.gameDate.update({
        where: { id: gameDateId },
        data: {
          status: 'completed',
          completedAt: new Date()
        }
      });
    }

      return NextResponse.json(elimination);
    } catch (error) {
      console.error('Error creating elimination:', error);
      return NextResponse.json(
        { error: 'Failed to create elimination' },
        { status: 500 }
      );
    }
  });
}