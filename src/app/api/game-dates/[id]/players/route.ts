import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withComisionAuth } from '@/lib/api-auth';
import { calculatePointsForPosition } from '@/lib/tournament-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gameDateId = parseInt((await params).id);

    // Validar que el ID sea un número válido
    if (isNaN(gameDateId)) {
      return NextResponse.json(
        { error: 'Invalid game date ID' },
        { status: 400 }
      );
    }

    // Obtener la fecha con sus jugadores
    const gameDate = await prisma.gameDate.findUnique({
      where: { id: gameDateId },
      select: {
        playerIds: true
      }
    });

    if (!gameDate) {
      return NextResponse.json(
        { error: 'Game date not found' },
        { status: 404 }
      );
    }

    // Obtener información de todos los jugadores
    const players = await prisma.player.findMany({
      where: {
        id: { in: gameDate.playerIds }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching game date players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}

// POST - Agregar un participante a la fecha (solo Comision, solo in_progress)
// Recalcula posiciones y puntos de eliminaciones existentes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(request, async (_req, _user) => {
    try {
      const gameDateId = parseInt((await params).id);
      const body = await request.json();
      const { playerId } = body;

      if (!playerId) {
        return NextResponse.json(
          { error: 'Se requiere playerId' },
          { status: 400 }
        );
      }

      // Verificar que el jugador existe
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        select: { id: true, firstName: true, lastName: true }
      });

      if (!player) {
        return NextResponse.json(
          { error: 'Jugador no encontrado' },
          { status: 404 }
        );
      }

      // Obtener la fecha
      const gameDate = await prisma.gameDate.findUnique({
        where: { id: gameDateId },
        select: {
          id: true,
          status: true,
          playerIds: true,
          tournamentId: true
        }
      });

      if (!gameDate) {
        return NextResponse.json(
          { error: 'Fecha no encontrada' },
          { status: 404 }
        );
      }

      // Solo permitir en fechas in_progress
      if (gameDate.status !== 'in_progress') {
        return NextResponse.json(
          { error: 'Solo se pueden agregar participantes a fechas en progreso' },
          { status: 400 }
        );
      }

      // Verificar que el jugador no está ya registrado
      if (gameDate.playerIds.includes(playerId)) {
        return NextResponse.json(
          { error: 'El jugador ya está registrado en esta fecha' },
          { status: 400 }
        );
      }

      // Usar transacción para asegurar consistencia
      const result = await prisma.$transaction(async (tx) => {
        // 1. Agregar jugador al array playerIds
        const newPlayerIds = [...gameDate.playerIds, playerId];

        await tx.gameDate.update({
          where: { id: gameDateId },
          data: { playerIds: newPlayerIds }
        });

        // 2. Recalcular posiciones y puntos de las eliminaciones existentes
        const newTotalPlayers = newPlayerIds.length;
        const allEliminations = await tx.elimination.findMany({
          where: { gameDateId },
          orderBy: { position: 'desc' }
        });

        // Recalcular posiciones secuencialmente (el nuevo jugador entra al final, no afecta el orden)
        let currentPosition = newTotalPlayers;
        for (const elim of allEliminations) {
          const newPoints = calculatePointsForPosition(currentPosition, newTotalPlayers);

          await tx.elimination.update({
            where: { id: elim.id },
            data: {
              position: currentPosition,
              points: newPoints
            }
          });

          currentPosition--;
        }

        return {
          addedPlayerId: playerId,
          playerName: `${player.firstName} ${player.lastName}`,
          newTotalPlayers,
          recalculatedEliminations: allEliminations.length
        };
      });

      return NextResponse.json({
        success: true,
        message: `${result.playerName} agregado. Recalculadas ${result.recalculatedEliminations} posiciones.`,
        ...result
      });

    } catch (error) {
      console.error('Error adding player to game date:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  });
}

// DELETE - Remover un participante de la fecha (solo Comision, solo in_progress)
// Recalcula posiciones y puntos de eliminaciones
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(request, async (_req, _user) => {
    try {
      const gameDateId = parseInt((await params).id);
      const body = await request.json();
      const { playerId } = body;

      if (!playerId) {
        return NextResponse.json(
          { error: 'Se requiere playerId' },
          { status: 400 }
        );
      }

      // Obtener la fecha
      const gameDate = await prisma.gameDate.findUnique({
        where: { id: gameDateId },
        select: {
          id: true,
          status: true,
          playerIds: true,
          tournamentId: true
        }
      });

      if (!gameDate) {
        return NextResponse.json(
          { error: 'Fecha no encontrada' },
          { status: 404 }
        );
      }

      // Solo permitir en fechas in_progress
      if (gameDate.status !== 'in_progress') {
        return NextResponse.json(
          { error: 'Solo se pueden remover participantes de fechas en progreso' },
          { status: 400 }
        );
      }

      // Verificar que el jugador está registrado
      if (!gameDate.playerIds.includes(playerId)) {
        return NextResponse.json(
          { error: 'El jugador no está registrado en esta fecha' },
          { status: 400 }
        );
      }

      // Usar transacción para asegurar consistencia
      const result = await prisma.$transaction(async (tx) => {
        // 1. Obtener todas las eliminaciones de esta fecha
        const allEliminations = await tx.elimination.findMany({
          where: { gameDateId },
          orderBy: { position: 'desc' } // Del último eliminado al primero
        });

        // 2. Verificar si el jugador ya fue eliminado
        const playerElimination = allEliminations.find(e => e.eliminatedPlayerId === playerId);

        // 3. Eliminar la eliminación del jugador si existe
        if (playerElimination) {
          await tx.elimination.delete({
            where: { id: playerElimination.id }
          });
        }

        // 4. Remover jugador del array playerIds
        const newPlayerIds = gameDate.playerIds.filter(id => id !== playerId);

        await tx.gameDate.update({
          where: { id: gameDateId },
          data: { playerIds: newPlayerIds }
        });

        // 5. Recalcular posiciones y puntos de las eliminaciones restantes
        const newTotalPlayers = newPlayerIds.length;
        const remainingEliminations = allEliminations.filter(e => e.eliminatedPlayerId !== playerId);

        // Ordenar por posición descendente (últimos eliminados primero)
        remainingEliminations.sort((a, b) => b.position - a.position);

        // Recalcular posiciones secuencialmente
        let currentPosition = newTotalPlayers;
        for (const elim of remainingEliminations) {
          const newPoints = calculatePointsForPosition(currentPosition, newTotalPlayers);

          await tx.elimination.update({
            where: { id: elim.id },
            data: {
              position: currentPosition,
              points: newPoints
            }
          });

          currentPosition--;
        }

        return {
          removedPlayerId: playerId,
          wasEliminated: !!playerElimination,
          newTotalPlayers,
          recalculatedEliminations: remainingEliminations.length
        };
      });

      return NextResponse.json({
        success: true,
        message: `Participante removido${result.wasEliminated ? ' y eliminación borrada' : ''}. Recalculadas ${result.recalculatedEliminations} posiciones.`,
        ...result
      });

    } catch (error) {
      console.error('Error removing player from game date:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  });
}