import { TiebreakerStats } from '../value-objects/TiebreakerStats';
import { Elimina2Score } from '../value-objects/Elimina2Score';
import { RankingTrend } from '../value-objects/RankingTrend';

/**
 * Player info needed for ranking display.
 */
export interface RankedPlayerInfo {
  id: string;
  name: string;
  alias?: string;
  photoUrl?: string;
}

/**
 * Entity representing a player's ranking in a tournament.
 *
 * Contains all calculated data for a single player's tournament performance:
 * - Position and trend
 * - Points (total and by date)
 * - ELIMINA 2 scoring
 * - Tiebreaker statistics
 */
export class PlayerRanking {
  private constructor(
    private _position: number,
    private readonly _player: RankedPlayerInfo,
    private readonly _pointsByDate: Map<number, number>,
    private readonly _datesPlayed: number,
    private readonly _score: Elimina2Score,
    private readonly _tiebreaker: TiebreakerStats,
    private _trend: RankingTrend
  ) {}

  /**
   * Creates a new PlayerRanking with calculated scores.
   */
  static create(
    player: RankedPlayerInfo,
    pointsByDate: Map<number, number>,
    datesPlayed: number,
    tiebreaker: TiebreakerStats
  ): PlayerRanking {
    const score = Elimina2Score.calculate(pointsByDate);

    return new PlayerRanking(
      0, // Position assigned later
      player,
      pointsByDate,
      datesPlayed,
      score,
      tiebreaker,
      RankingTrend.same()
    );
  }

  /**
   * Reconstitutes a PlayerRanking from stored data.
   */
  static reconstitute(
    position: number,
    player: RankedPlayerInfo,
    pointsByDate: Map<number, number>,
    datesPlayed: number,
    score: Elimina2Score,
    tiebreaker: TiebreakerStats,
    trend: RankingTrend
  ): PlayerRanking {
    return new PlayerRanking(
      position,
      player,
      pointsByDate,
      datesPlayed,
      score,
      tiebreaker,
      trend
    );
  }

  // Getters
  get position(): number {
    return this._position;
  }

  get playerId(): string {
    return this._player.id;
  }

  get playerName(): string {
    return this._player.name;
  }

  get playerAlias(): string | undefined {
    return this._player.alias;
  }

  get playerPhoto(): string | undefined {
    return this._player.photoUrl;
  }

  get player(): RankedPlayerInfo {
    return { ...this._player };
  }

  get totalPoints(): number {
    return this._score.totalPoints;
  }

  get finalScore(): number {
    return this._score.finalScore;
  }

  get rankingScore(): number {
    return this._score.rankingScore;
  }

  get datesPlayed(): number {
    return this._datesPlayed;
  }

  get pointsByDate(): Record<number, number> {
    return Object.fromEntries(this._pointsByDate);
  }

  getPointsForDate(dateNumber: number): number {
    return this._pointsByDate.get(dateNumber) ?? 0;
  }

  get score(): Elimina2Score {
    return this._score;
  }

  get tiebreaker(): TiebreakerStats {
    return this._tiebreaker;
  }

  get firstPlaces(): number {
    return this._tiebreaker.firstPlaces;
  }

  get secondPlaces(): number {
    return this._tiebreaker.secondPlaces;
  }

  get thirdPlaces(): number {
    return this._tiebreaker.thirdPlaces;
  }

  get absences(): number {
    return this._tiebreaker.absences;
  }

  get trend(): RankingTrend {
    return this._trend;
  }

  get elimina1(): number | undefined {
    return this._score.elimina1 ?? undefined;
  }

  get elimina2(): number | undefined {
    return this._score.elimina2 ?? undefined;
  }

  // Mutators (return new instance or modify in place for ranking calculation)
  setPosition(position: number): void {
    this._position = position;
  }

  setTrend(trend: RankingTrend): void {
    this._trend = trend;
  }

  /**
   * Compares this ranking with another for sorting.
   * Used by RankingCalculator to determine positions.
   *
   * Returns negative if this should rank higher (better).
   */
  compareTo(other: PlayerRanking): number {
    // 1. Compare by score (finalScore/totalPoints)
    const scoreComparison = this._score.compareTo(other._score);
    if (scoreComparison !== 0) {
      return scoreComparison;
    }

    // 2. Compare by tiebreaker stats
    const tiebreakerComparison = this._tiebreaker.compareTo(other._tiebreaker);
    if (tiebreakerComparison !== 0) {
      return tiebreakerComparison;
    }

    // 3. Alphabetical by name (final tiebreaker)
    return this._player.name.localeCompare(other._player.name);
  }

  /**
   * Checks if this ranking is truly equal to another (same position after all criteria).
   */
  isTiedWith(other: PlayerRanking): boolean {
    return this.compareTo(other) === 0;
  }
}
