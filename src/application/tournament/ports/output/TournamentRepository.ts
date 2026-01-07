import type { Tournament, TournamentStatus } from '@/domain/tournament';

/**
 * Output port for tournament data access.
 */
export interface TournamentRepository {
  /**
   * Find all tournaments, optionally filtered by status.
   */
  findAll(status?: TournamentStatus): Promise<Tournament[]>;

  /**
   * Find a tournament by its ID.
   */
  findById(id: number): Promise<Tournament | null>;

  /**
   * Find the currently active tournament.
   */
  findActive(): Promise<Tournament | null>;

  /**
   * Find the most recent tournament by number.
   */
  findMostRecent(): Promise<Tournament | null>;
}
