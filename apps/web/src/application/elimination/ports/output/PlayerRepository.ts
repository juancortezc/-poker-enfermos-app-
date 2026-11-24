/**
 * Minimal Player data needed by the Elimination bounded context.
 */
export interface PlayerInfo {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
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
   * Busca varios jugadores de una sola vez. Existe para no disparar una
   * consulta por jugador por eliminacion en la pantalla mas pedida de la
   * noche, que era lo que hacia el listado de eliminaciones.
   */
  findByIds(ids: string[]): Promise<PlayerInfo[]>;

  /**
   * Updates the last victory date for a player.
   * Called when a player wins (position 1).
   */
  updateLastVictoryDate(playerId: string, victoryDate: string): Promise<void>;
}
