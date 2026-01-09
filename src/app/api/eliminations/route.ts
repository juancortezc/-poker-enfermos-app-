import { NextRequest, NextResponse } from 'next/server';
import { withComisionAuth } from '@/lib/api-auth';
import { bootstrapInfrastructure } from '@/infrastructure/bootstrap';
import { getRegisterEliminationUseCase } from '@/infrastructure';
import { handleEliminationError } from '@/infrastructure/http/errorHandler';
import { broadcastPushNotification } from '@/lib/push-service';

// Ensure dependencies are registered
bootstrapInfrastructure();

/**
 * POST /api/eliminations
 *
 * Registers a new player elimination.
 * Requires Comision role.
 */
export async function POST(request: NextRequest) {
  return withComisionAuth(request, async () => {
    try {
      const body = await request.json();
      const { gameDateId, position, eliminatedPlayerId, eliminatorPlayerId } = body;

      // Basic input validation
      if (!gameDateId || !position || !eliminatedPlayerId) {
        return NextResponse.json(
          { error: 'Missing required fields: gameDateId, position, eliminatedPlayerId' },
          { status: 400 }
        );
      }

      // Execute use case
      const useCase = getRegisterEliminationUseCase();
      const result = await useCase.execute({
        gameDateId,
        position,
        eliminatedPlayerId,
        eliminatorPlayerId: eliminatorPlayerId || null,
      });

      // Send broadcast push notification to all users
      const eliminatedName = `${result.eliminatedPlayer.firstName} ${result.eliminatedPlayer.lastName}`;
      const eliminatorName = result.eliminatorPlayer
        ? `${result.eliminatorPlayer.firstName} ${result.eliminatorPlayer.lastName}`
        : null;

      if (position === 1) {
        // Winner notification
        await broadcastPushNotification(
          {
            title: 'Tenemos ganador!',
            body: `${eliminatedName} gana la fecha con ${result.points} puntos`,
            tag: `winner-${gameDateId}`,
            url: '/home',
            data: { type: 'winner', gameDateId, playerId: eliminatedPlayerId }
          },
          { targetRoles: ['Comision', 'Enfermo'] }
        ).catch(err => console.error('Failed to send winner notification:', err));
      } else {
        // Regular elimination notification
        const eliminationMessage = eliminatorName
          ? `${eliminatedName} eliminado en posicion ${position} (${result.points} pts), eliminado por ${eliminatorName}`
          : `${eliminatedName} eliminado en posicion ${position} (${result.points} pts)`;

        await broadcastPushNotification(
          {
            title: 'Jugador eliminado',
            body: eliminationMessage,
            tag: `elimination-${gameDateId}-${position}`,
            url: '/home',
            data: { type: 'elimination', gameDateId, position, playerId: eliminatedPlayerId }
          },
          { targetRoles: ['Comision', 'Enfermo'] }
        ).catch(err => console.error('Failed to send elimination notification:', err));
      }

      // Return response (compatible with existing frontend)
      return NextResponse.json({
        id: result.id,
        gameDateId: result.gameDateId,
        position: result.position,
        points: result.points,
        eliminatedPlayer: result.eliminatedPlayer,
        eliminatorPlayer: result.eliminatorPlayer,
        eliminationTime: result.eliminationTime,
      });
    } catch (error) {
      return handleEliminationError(error);
    }
  });
}
