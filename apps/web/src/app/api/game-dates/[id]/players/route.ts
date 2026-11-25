import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireComision } from '@/lib/api-auth';
import { calculatePointsForPosition, gameDatePlayerSchema, idParamsSchema } from '@poker/shared';
import { AppError, withErrorHandler } from '@/lib/errors';
import { ok, parseBody, parseParams } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrorHandler(async (request: NextRequest, { params }: Ctx) => {
  const { id: gameDateId } = parseParams(await params, idParamsSchema);

  // Obtener la fecha con sus jugadores
  const gameDate = await prisma.gameDate.findUnique({
    where: { id: gameDateId },
    select: {
      playerIds: true
    }
  });

  if (!gameDate) {
    throw AppError.notFound('Fecha no encontrada', 'GAME_DATE_NOT_FOUND');
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

  return ok(players);
})

// POST - Agregar un participante a la fecha (solo Comision, solo in_progress)
// Recalcula posiciones y puntos de eliminaciones existentes
export const POST = withErrorHandler(async (request: NextRequest, { params }: Ctx) => {
  await requireComision(request)
  const { id: gameDateId } = parseParams(await params, idParamsSchema);
  const { playerId } = await parseBody(request, gameDatePlayerSchema);

  // Verificar que el jugador existe
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, firstName: true, lastName: true }
  });

  if (!player) {
    throw AppError.notFound('Jugador no encontrado', 'PLAYER_NOT_FOUND');
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
    throw AppError.notFound('Fecha no encontrada', 'GAME_DATE_NOT_FOUND');
  }

  // Solo permitir en fechas in_progress
  if (gameDate.status !== 'in_progress') {
    throw AppError.badRequest('Solo se pueden agregar participantes a fechas en progreso', 'GAME_DATE_NOT_IN_PROGRESS');
  }

  // Verificar que el jugador no está ya registrado
  if (gameDate.playerIds.includes(playerId)) {
    throw AppError.badRequest('El jugador ya está registrado en esta fecha', 'PLAYER_ALREADY_IN_GAME_DATE');
  }

  // Usar transacción para asegurar consistencia
  const result = await prisma.$transaction(async (tx) => {
    // La lista se relee DENTRO de la transaccion. Leerla afuera permitia
    // que dos altas simultaneas partieran de la misma foto y una pisara a
    // la otra, y que una eliminacion registrada en ese instante calculara
    // sus puntos sobre el total viejo.
    const fresh = await tx.gameDate.findUnique({
      where: { id: gameDateId },
      select: { playerIds: true }
    });

    if (!fresh) {
      throw AppError.notFound('La fecha ya no existe', 'GAME_DATE_NOT_FOUND');
    }

    if (fresh.playerIds.includes(playerId)) {
      throw AppError.badRequest('El jugador ya está registrado en esta fecha', 'PLAYER_ALREADY_IN_GAME_DATE');
    }

    // 1. Agregar jugador al array playerIds
    const newPlayerIds = [...fresh.playerIds, playerId];

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
  }, { isolationLevel: 'Serializable' });

  return ok({
    message: `${result.playerName} agregado. Recalculadas ${result.recalculatedEliminations} posiciones.`,
    ...result
  });

})

// DELETE - Remover un participante de la fecha (solo Comision, solo in_progress)
// Recalcula posiciones y puntos de eliminaciones
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: Ctx) => {
  await requireComision(request)
  const { id: gameDateId } = parseParams(await params, idParamsSchema);
  const { playerId } = await parseBody(request, gameDatePlayerSchema);

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
    throw AppError.notFound('Fecha no encontrada', 'GAME_DATE_NOT_FOUND');
  }

  // Solo permitir en fechas in_progress
  if (gameDate.status !== 'in_progress') {
    throw AppError.badRequest('Solo se pueden remover participantes de fechas en progreso', 'GAME_DATE_NOT_IN_PROGRESS');
  }

  // Verificar que el jugador está registrado
  if (!gameDate.playerIds.includes(playerId)) {
    throw AppError.badRequest('El jugador no está registrado en esta fecha', 'PLAYER_NOT_IN_GAME_DATE');
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

  return ok({
    message: `Participante removido${result.wasEliminated ? ' y eliminación borrada' : ''}. Recalculadas ${result.recalculatedEliminations} posiciones.`,
    ...result
  });

})