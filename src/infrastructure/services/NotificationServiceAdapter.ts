import { NotificationService } from '@/application/elimination';
import { sendNotificationIfEnabled } from '@/lib/notification-config';

/**
 * Adapter that implements NotificationService port using existing notification infrastructure.
 */
export class NotificationServiceAdapter implements NotificationService {
  async notifyPlayerEliminated(params: {
    playerId: string;
    playerName: string;
    position: number;
    points: number;
    gameDateId: number;
  }): Promise<void> {
    await sendNotificationIfEnabled(
      'player_eliminated',
      '💀 Jugador Eliminado',
      `${params.playerName} eliminado en posición ${params.position}°`,
      {
        playerId: params.playerId,
        playerName: params.playerName,
        position: params.position,
        points: params.points,
        gameDateId: params.gameDateId,
      }
    );
  }

  async notifyWinnerDeclared(params: {
    playerId: string;
    playerName: string;
    points: number;
    gameDateId: number;
  }): Promise<void> {
    await sendNotificationIfEnabled(
      'winner_declared',
      '🏆 ¡Tenemos Ganador!',
      `${params.playerName} ha ganado la fecha con ${params.points} puntos`,
      {
        playerId: params.playerId,
        playerName: params.playerName,
        points: params.points,
        gameDateId: params.gameDateId,
        position: 1,
      }
    );
  }
}
