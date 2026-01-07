/**
 * Output port for sending notifications after eliminations.
 *
 * The implementation handles checking if notifications are enabled,
 * the use case just calls the methods.
 */
export interface NotificationService {
  /**
   * Sends notification when a player is eliminated (not winner).
   */
  notifyPlayerEliminated(params: {
    playerId: string;
    playerName: string;
    position: number;
    points: number;
    gameDateId: number;
  }): Promise<void>;

  /**
   * Sends notification when a winner is declared.
   */
  notifyWinnerDeclared(params: {
    playerId: string;
    playerName: string;
    points: number;
    gameDateId: number;
  }): Promise<void>;
}
