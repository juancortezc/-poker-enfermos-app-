/**
 * Query for getting a tournament's ranking.
 */
export interface GetTournamentRankingQuery {
  tournamentId: number;
}

/**
 * Player ranking data returned by the query.
 */
export interface PlayerRankingDTO {
  position: number;
  playerId: string;
  playerName: string;
  playerAlias?: string;
  playerPhoto?: string;
  totalPoints: number;
  datesPlayed: number;
  pointsByDate: Record<number, number>;
  trend: 'up' | 'down' | 'same';
  positionsChanged: number;
  // ELIMINA 2
  elimina1?: number;
  elimina2?: number;
  finalScore?: number;
  // Tiebreaker stats
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
  absences: number;
}

/**
 * Tournament ranking data returned by the query.
 */
export interface TournamentRankingDTO {
  tournament: {
    id: number;
    name: string;
    number: number;
    totalDates: number;
    completedDates: number;
  };
  rankings: PlayerRankingDTO[];
  lastUpdated: string;
}

/**
 * Input port for getting a tournament's complete ranking.
 */
export interface GetTournamentRankingUseCase {
  execute(query: GetTournamentRankingQuery): Promise<TournamentRankingDTO | null>;
}
