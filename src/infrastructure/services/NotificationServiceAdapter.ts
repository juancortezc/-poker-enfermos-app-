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
    eliminatorName?: string;
  }): Promise<void> {
    const body = params.eliminatorName
      ? `${params.playerName}, eliminado en posición ${params.position}° por ${params.eliminatorName}`
      : `${params.playerName}, eliminado en posición ${params.position}°`;

    await sendNotificationIfEnabled(
      'player_eliminated',
      '💀 Eliminado',
      body,
      {
        playerId: params.playerId,
        playerName: params.playerName,
        position: params.position,
        points: params.points,
        gameDateId: params.gameDateId,
        eliminatorName: params.eliminatorName,
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
      '🏆 ¡Tenemos Campeón!',
      `${params.playerName} es el Campeón de la Fecha!`,
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
