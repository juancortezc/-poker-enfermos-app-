/**
 * Value Object that encapsulates tiebreaker statistics for a player.
 *
 * Used to resolve ties when players have the same total/final score.
 * Criteria in order of priority:
 * 1. More first places (victories)
 * 2. More second places
 * 3. More third places
 * 4. Fewer absences (better attendance)
 */
export class TiebreakerStats {
  private constructor(
    private readonly _firstPlaces: number,
    private readonly _secondPlaces: number,
    private readonly _thirdPlaces: number,
    private readonly _absences: number
  ) {}

  static create(
    firstPlaces: number,
    secondPlaces: number,
    thirdPlaces: number,
    absences: number
  ): TiebreakerStats {
    return new TiebreakerStats(
      Math.max(0, firstPlaces),
      Math.max(0, secondPlaces),
      Math.max(0, thirdPlaces),
      Math.max(0, absences)
    );
  }

  static empty(): TiebreakerStats {
    return new TiebreakerStats(0, 0, 0, 0);
  }

  get firstPlaces(): number {
    return this._firstPlaces;
  }

  get secondPlaces(): number {
    return this._secondPlaces;
  }

  get thirdPlaces(): number {
    return this._thirdPlaces;
  }

  get absences(): number {
    return this._absences;
  }

  /**
   * Total podium finishes (1st + 2nd + 3rd).
   */
  get podiumFinishes(): number {
    return this._firstPlaces + this._secondPlaces + this._thirdPlaces;
  }

  /**
   * Creates a new TiebreakerStats with an added first place.
   */
  withFirstPlace(): TiebreakerStats {
    return new TiebreakerStats(
      this._firstPlaces + 1,
      this._secondPlaces,
      this._thirdPlaces,
      this._absences
    );
  }

  /**
   * Creates a new TiebreakerStats with an added second place.
   */
  withSecondPlace(): TiebreakerStats {
    return new TiebreakerStats(
      this._firstPlaces,
      this._secondPlaces + 1,
      this._thirdPlaces,
      this._absences
    );
  }

  /**
   * Creates a new TiebreakerStats with an added third place.
   */
  withThirdPlace(): TiebreakerStats {
    return new TiebreakerStats(
      this._firstPlaces,
      this._secondPlaces,
      this._thirdPlaces + 1,
      this._absences
    );
  }

  /**
   * Creates a new TiebreakerStats with an added absence.
   */
  withAbsence(): TiebreakerStats {
    return new TiebreakerStats(
      this._firstPlaces,
      this._secondPlaces,
      this._thirdPlaces,
      this._absences + 1
    );
  }

  /**
   * Compares this stats with another for tiebreaking.
   * Returns negative if this is better, positive if other is better, 0 if equal.
   */
  compareTo(other: TiebreakerStats): number {
    // More first places is better
    if (this._firstPlaces !== other._firstPlaces) {
      return other._firstPlaces - this._firstPlaces;
    }

    // More second places is better
    if (this._secondPlaces !== other._secondPlaces) {
      return other._secondPlaces - this._secondPlaces;
    }

    // More third places is better
    if (this._thirdPlaces !== other._thirdPlaces) {
      return other._thirdPlaces - this._thirdPlaces;
    }

    // Fewer absences is better
    if (this._absences !== other._absences) {
      return this._absences - other._absences;
    }

    return 0;
  }

  equals(other: TiebreakerStats): boolean {
    return (
      this._firstPlaces === other._firstPlaces &&
      this._secondPlaces === other._secondPlaces &&
      this._thirdPlaces === other._thirdPlaces &&
      this._absences === other._absences
    );
  }
}
