import { PlayerRankingDTO } from './GetTournamentRankingUseCase';

/**
 * Query for getting a specific player's ranking in a tournament.
 */
export interface GetPlayerRankingQuery {
  tournamentId: number;
  playerId: string;
}

/**
 * Input port for getting a player's ranking in a tournament.
 */
export interface GetPlayerRankingUseCase {
  execute(query: GetPlayerRankingQuery): Promise<PlayerRankingDTO | null>;
}
