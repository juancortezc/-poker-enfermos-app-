/**
 * Elimination Bounded Context - Domain Layer
 *
 * This module contains the core business logic for player eliminations
 * in poker tournaments. It is framework-agnostic and has no external
 * dependencies except for shared constants.
 *
 * Key concepts:
 * - Elimination: Aggregate root representing a player's elimination
 * - Position: Value object for elimination position (1 = winner)
 * - Points: Value object encapsulating ELIMINA 2 scoring
 * - PointsCalculator: Domain service for points calculations
 */

// Entities
export { Elimination } from './entities/Elimination';
export type {
  CreateEliminationProps,
  EliminationProps,
} from './entities/Elimination';

// Value Objects
export { Position } from './value-objects/Position';
export { Points } from './value-objects/Points';

// Domain Services
export { PointsCalculator } from './services/PointsCalculator';

// Errors
export {
  EliminationError,
  PlayerAlreadyEliminatedError,
  PositionAlreadyTakenError,
  InvalidEliminatorError,
  GameDateNotInProgressError,
  InvalidPositionError,
} from './errors/EliminationError';
