/**
 * Minimal Player data needed by the Elimination bounded context.
 */
export interface PlayerInfo {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Output port for Player operations needed by Elimination use cases.
 */
export interface PlayerRepository {
  /**
   * Finds a player by ID.
   */
  findById(id: string): Promise<PlayerInfo | null>;

  /**
   * Updates the last victory date for a player.
   * Called when a player wins (position 1).
   */
  updateLastVictoryDate(playerId: string, victoryDate: string): Promise<void>;
}
