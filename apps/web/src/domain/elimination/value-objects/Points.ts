import {
  MIN_PLAYERS,
  MAX_PLAYERS,
  calculatePointsForPosition,
  getPointsDistribution,
} from '@poker/shared';

/**
 * Value Object that represents points earned for an elimination position.
 *
 * El cálculo NO vive aquí: delega en `calculatePointsForPosition` de
 * `@poker/shared`, la única tabla ELIMINA 2 (la misma que usan la web, la
 * app y los scripts). Aquí había una segunda implementación (hallazgo H6).
 *
 * Lo único propio de este VO es cómo acota la cantidad de jugadores ANTES de
 * calcular, que es el comportamiento histórico de /api/eliminations:
 * - 10 a 24 jugadores: idéntico a `calculatePointsForPosition` (el clamp no
 *   hace nada).
 * - 9 o menos: se calcula con la tabla de 9 y las posiciones 1..9 puntúan
 *   aunque haya menos jugadores. Pendiente de la tabla que está aprobando el
 *   usuario; no cambiar sin esa aprobación.
 * - Más de 24: tabla de 24; posiciones por encima de 24 valen 0.
 * Ver points-equivalence.test.ts.
 */
export class Points {
  private constructor(private readonly _value: number) {}

  /** Cantidad de jugadores con la que se construye la tabla. */
  private static clampPlayers(totalPlayers: number): number {
    return Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, totalPlayers));
  }

  /**
   * Calculates points for a given position and total players.
   * Uses the ELIMINA 2 scoring system.
   */
  static calculate(position: number, totalPlayers: number): Points {
    return new Points(calculatePointsForPosition(position, Points.clampPlayers(totalPlayers)));
  }

  /**
   * Creates Points with a known value (for reconstitution from persistence).
   */
  static fromValue(value: number): Points {
    return new Points(value);
  }

  /**
   * Gets the complete points distribution for a given number of players.
   * Index 0 = position 1 (winner).
   */
  static getDistribution(totalPlayers: number): number[] {
    return getPointsDistribution(Points.clampPlayers(totalPlayers));
  }

  get value(): number {
    return this._value;
  }

  equals(other: Points): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return `${this._value} pts`;
  }
}
