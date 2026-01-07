import { InvalidPositionError } from '../errors/EliminationError';
import { MIN_PLAYERS, MAX_PLAYERS } from '@/lib/constants/scoring';

/**
 * Value Object that represents a player's elimination position.
 *
 * Position 1 = Winner (last standing)
 * Position N = First eliminated (where N = total players)
 *
 * Immutable and self-validating.
 */
export class Position {
  private constructor(
    private readonly _value: number,
    private readonly _totalPlayers: number
  ) {}

  /**
   * Creates a valid Position or throws InvalidPositionError.
   */
  static create(position: number, totalPlayers: number): Position {
    const clampedTotal = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, totalPlayers));

    if (position < 1 || position > clampedTotal) {
      throw new InvalidPositionError(position, clampedTotal);
    }

    return new Position(position, clampedTotal);
  }

  get value(): number {
    return this._value;
  }

  get totalPlayers(): number {
    return this._totalPlayers;
  }

  /**
   * Position 1 is the winner.
   */
  isWinner(): boolean {
    return this._value === 1;
  }

  /**
   * Position 2 is the runner-up (subcampeón).
   */
  isRunnerUp(): boolean {
    return this._value === 2;
  }

  /**
   * Podium positions: 1, 2, 3
   */
  isPodium(): boolean {
    return this._value >= 1 && this._value <= 3;
  }

  /**
   * Returns true if this position was eliminated BEFORE the other position.
   * Higher position number = eliminated earlier.
   */
  wasEliminatedBefore(other: Position): boolean {
    return this._value > other._value;
  }

  equals(other: Position): boolean {
    return this._value === other._value && this._totalPlayers === other._totalPlayers;
  }

  toString(): string {
    return `${this._value}° of ${this._totalPlayers}`;
  }
}
