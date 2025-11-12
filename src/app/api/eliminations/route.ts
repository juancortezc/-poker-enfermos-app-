import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withComisionAuth } from '@/lib/api-auth';
import { calculatePointsForPosition } from '@/lib/tournament-utils';
import { updateParentChildStats } from '@/lib/parent-child-stats';
import { sendNotificationIfEnabled } from '@/lib/notification-config';
import { getEcuadorDate } from '@/lib/date-utils';

export async function POST(request: NextRequest) {
  return withComisionAuth(request, async (_req, _user) => {
    try {
      const body = await request.json();
      console.log('[ELIMINATIONS API] Received body:', body);
      
      const { gameDateId, position, eliminatedPlayerId, eliminatorPlayerId } = body;

      // Validaciones
      if (!gameDateId || !position || !eliminatedPlayerId) {
        console.log('[ELIMINATIONS API] Missing required fields:', { gameDateId, position, eliminatedPlayerId });
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
        eliminatedPlayerId: eliminatedPlayerId
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
    if (eliminatorPlayerId) {
      const eliminatorEliminated = await prisma.elimination.findFirst({
        where: {
          gameDateId,
          eliminatedPlayerId: eliminatorPlayerId,
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

    // Crear la eliminación (usar hora de Ecuador)
    const elimination = await prisma.elimination.create({
      data: {
        gameDateId,
        position,
        eliminatedPlayerId: eliminatedPlayerId,
        eliminatorPlayerId: eliminatorPlayerId,
        points,
        eliminationTime: getEcuadorDate().toISOString()
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

    // Si es posición 1 (ganador), actualizar lastVictoryDate
    if (position === 1) {
      const victoryDate = gameDate.scheduledDate.toLocaleDateString('es-EC'); // DD/MM/YYYY format
      await prisma.player.update({
        where: { id: eliminatedPlayerId },
        data: {
          lastVictoryDate: victoryDate
        }
      });
      console.log('[ELIMINATION API] Updated lastVictoryDate for manual winner:', eliminatedPlayerId, 'Date:', victoryDate);

      // Send winner notification (if enabled)
      await sendNotificationIfEnabled(
        'winner_declared',
        '🏆 ¡Tenemos Ganador!',
        `${elimination.eliminatedPlayer.firstName} ${elimination.eliminatedPlayer.lastName} ha ganado la fecha con ${points} puntos`,
        {
          playerId: eliminatedPlayerId,
          playerName: `${elimination.eliminatedPlayer.firstName} ${elimination.eliminatedPlayer.lastName}`,
          points,
          gameDateId,
          position: 1
        }
      )
    } else {
      // Send elimination notification for other positions (if enabled)
      await sendNotificationIfEnabled(
        'player_eliminated',
        '💀 Jugador Eliminado',
        `${elimination.eliminatedPlayer.firstName} ${elimination.eliminatedPlayer.lastName} eliminado en posición ${position}°`,
        {
          playerId: eliminatedPlayerId,
          playerName: `${elimination.eliminatedPlayer.firstName} ${elimination.eliminatedPlayer.lastName}`,
          position,
          points,
          gameDateId
        }
      )
    }

    // Actualizar estadísticas padre-hijo si hay eliminador
    if (eliminatorPlayerId) {
      await updateParentChildStats(
        gameDate.tournament.id,
        eliminatorPlayerId,
        eliminatedPlayerId,
        gameDate.scheduledDate
      );
    }

    // Si llegamos a la posición 2, auto-completar la fecha
    if (position === 2 && eliminatorPlayerId) {
      console.log('[ELIMINATION API] Position 2 reached, checking if we should auto-complete...');
      
      // Verificar cuántas eliminaciones hay tras registrar al subcampeón
      const existingEliminations = await prisma.elimination.count({
        where: { gameDateId }
      });

      // Para llegar al ganador necesitamos todas las posiciones salvo la 1 registrada manualmente
      const expectedBeforeWinner = Math.max(totalPlayers - 1, 0);

      console.log(`[ELIMINATION API] Total players: ${totalPlayers}, Existing eliminations: ${existingEliminations}, Expected before winner: ${expectedBeforeWinner}`);

      if (existingEliminations === expectedBeforeWinner) {
        console.log('[ELIMINATION API] Auto-completing game date...');
        
        // Crear la eliminación del ganador (posición 1)
        const winnerPoints = calculatePointsForPosition(1, totalPlayers);
        
        await prisma.elimination.create({
          data: {
            gameDateId,
            position: 1,
            eliminatedPlayerId: eliminatorPlayerId,
            eliminatorPlayerId,
            points: winnerPoints,
            eliminationTime: getEcuadorDate().toISOString()
          }
        });

        // Actualizar lastVictoryDate del ganador
        const gameDateForWinner = await prisma.gameDate.findUnique({
          where: { id: gameDateId },
          select: { scheduledDate: true }
        });
        
        if (gameDateForWinner) {
          const victoryDate = gameDateForWinner.scheduledDate.toLocaleDateString('es-EC'); // DD/MM/YYYY format
          await prisma.player.update({
            where: { id: eliminatorPlayerId },
            data: { 
              lastVictoryDate: victoryDate
            }
          });
          console.log('[ELIMINATION API] Updated lastVictoryDate for auto-completed winner:', eliminatorPlayerId, 'Date:', victoryDate);
        }

        // Marcar la fecha como completada
        await prisma.gameDate.update({
          where: { id: gameDateId },
          data: {
            status: 'completed'
          }
        });
        
        console.log('[ELIMINATION API] Game date completed successfully');
      } else {
        console.log('[ELIMINATION API] Not auto-completing. Elimination count mismatch.');
      }
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
