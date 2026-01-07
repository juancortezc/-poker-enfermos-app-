import { PlayerRanking } from './PlayerRanking';
import { RankingTrend } from '../value-objects/RankingTrend';

/**
 * Tournament info for ranking context.
 */
export interface RankedTournamentInfo {
  id: number;
  name: string;
  number: number;
  totalDates: number;
  completedDates: number;
}

/**
 * Aggregate Root for the Ranking bounded context.
 *
 * Represents the complete ranking state for a tournament,
 * including all player rankings with their positions, scores, and trends.
 */
export class TournamentRanking {
  private constructor(
    private readonly _tournament: RankedTournamentInfo,
    private readonly _rankings: PlayerRanking[],
    private readonly _lastUpdated: Date
  ) {}

  /**
   * Creates a new TournamentRanking from unsorted player rankings.
   * Sorts rankings and assigns positions.
   */
  static create(
    tournament: RankedTournamentInfo,
    playerRankings: PlayerRanking[]
  ): TournamentRanking {
    // Sort by comparison criteria
    const sorted = [...playerRankings].sort((a, b) => a.compareTo(b));

    // Assign positions (handle ties)
    let currentPosition = 1;
    sorted.forEach((ranking, index) => {
      if (index > 0) {
        const previous = sorted[index - 1];
        // Only increment position if not tied
        if (!previous.isTiedWith(ranking)) {
          currentPosition = index + 1;
        }
      }
      ranking.setPosition(currentPosition);
    });

    return new TournamentRanking(tournament, sorted, new Date());
  }

  /**
   * Reconstitutes a TournamentRanking from stored data.
   */
  static reconstitute(
    tournament: RankedTournamentInfo,
    rankings: PlayerRanking[],
    lastUpdated: Date
  ): TournamentRanking {
    return new TournamentRanking(tournament, rankings, lastUpdated);
  }

  // Getters
  get tournament(): RankedTournamentInfo {
    return { ...this._tournament };
  }

  get tournamentId(): number {
    return this._tournament.id;
  }

  get tournamentName(): string {
    return this._tournament.name;
  }

  get tournamentNumber(): number {
    return this._tournament.number;
  }

  get totalDates(): number {
    return this._tournament.totalDates;
  }

  get completedDates(): number {
    return this._tournament.completedDates;
  }

  get rankings(): readonly PlayerRanking[] {
    return this._rankings;
  }

  get lastUpdated(): Date {
    return this._lastUpdated;
  }

  get playerCount(): number {
    return this._rankings.length;
  }

  /**
   * Gets the ranking for a specific player.
   */
  getPlayerRanking(playerId: string): PlayerRanking | undefined {
    return this._rankings.find((r) => r.playerId === playerId);
  }

  /**
   * Gets the top N players.
   */
  getTopPlayers(count: number): readonly PlayerRanking[] {
    return this._rankings.slice(0, count);
  }

  /**
   * Gets the current leader (position 1).
   */
  getLeader(): PlayerRanking | undefined {
    return this._rankings.find((r) => r.position === 1);
  }

  /**
   * Gets players in podium positions (1, 2, 3).
   */
  getPodium(): readonly PlayerRanking[] {
    return this._rankings.filter((r) => r.position <= 3);
  }

  /**
   * Applies trends by comparing with a previous ranking state.
   */
  applyTrends(previousRanking: TournamentRanking | null): void {
    if (!previousRanking) {
      // No previous ranking - all trends are 'same'
      this._rankings.forEach((r) => r.setTrend(RankingTrend.same()));
      return;
    }

    this._rankings.forEach((ranking) => {
      const previousPlayerRanking = previousRanking.getPlayerRanking(ranking.playerId);
      const previousPosition = previousPlayerRanking?.position ?? null;

      const trend = RankingTrend.calculate(previousPosition, ranking.position);
      ranking.setTrend(trend);
    });
  }

  /**
   * Checks if the tournament has enough dates for ELIMINA 2 to apply.
   */
  isElimina2Applied(): boolean {
    return this._tournament.completedDates >= 6;
  }
}
