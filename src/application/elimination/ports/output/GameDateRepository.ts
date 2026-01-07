/**
 * Minimal GameDate data needed by the Elimination bounded context.
 * We don't import the full GameDate entity to avoid coupling.
 */
export interface GameDateInfo {
  id: number;
  tournamentId: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  playerIds: string[];
  scheduledDate: Date;
}

/**
 * Output port for GameDate queries needed by Elimination use cases.
 *
 * This is a read-only interface - Elimination context doesn't modify game dates
 * directly, it emits events that the Tournament context handles.
 */
export interface GameDateRepository {
  /**
   * Finds a game date by ID with minimal info needed for elimination validation.
   */
  findById(id: number): Promise<GameDateInfo | null>;

  /**
   * Marks a game date as completed.
   * Called when auto-completing after position 2 is registered.
   */
  markAsCompleted(id: number): Promise<void>;
}
