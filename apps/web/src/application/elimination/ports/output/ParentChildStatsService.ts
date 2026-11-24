/**
 * Output port for updating parent-child elimination statistics.
 *
 * Tracks when players eliminate each other across a tournament,
 * identifying "parent-child" relationships (who eliminates whom most often).
 */
export interface ParentChildStatsService {
  /**
   * Updates statistics when a player eliminates another.
   */
  updateStats(params: {
    tournamentId: number;
    eliminatorId: string;
    eliminatedId: string;
    gameDateDate: Date;
    /** Posicion de la eliminacion; la 1 es el ganador y no cuenta. */
    position?: number;
  }): Promise<void>;
}
