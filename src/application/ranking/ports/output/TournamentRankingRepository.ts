import type { RankedTournamentInfo } from '@/domain/ranking';
import type { GameDateParticipation, PlayerRankingInput } from '@/domain/ranking';

/**
 * Raw tournament data needed for ranking calculation.
 */
export interface TournamentRankingData {
  tournament: RankedTournamentInfo;
  playerInputs: PlayerRankingInput[];
}

/**
 * Output port for fetching tournament data needed for ranking.
 *
 * This interface abstracts the data fetching from Prisma,
 * allowing the use case to focus on orchestration.
 */
export interface TournamentRankingRepository {
  /**
   * Fetches all data needed to calculate a tournament's ranking.
   * Returns null if tournament doesn't exist.
   */
  getTournamentRankingData(tournamentId: number): Promise<TournamentRankingData | null>;

  /**
   * Fetches data for calculating ranking up to a specific date number.
   * Used for trend calculation (comparing with previous date).
   */
  getTournamentRankingDataUpToDate(
    tournamentId: number,
    maxDateNumber: number
  ): Promise<TournamentRankingData | null>;
}
