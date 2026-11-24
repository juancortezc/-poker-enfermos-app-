/**
 * Tournament Domain - Public API
 *
 * This module exports all public types, entities, and errors
 * for the Tournament bounded context.
 */

// Entities
export {
  Tournament,
  type TournamentStatus,
  type GameDateStatus,
  type BlindLevel,
  type GameDateInfo,
  type TournamentParticipant,
} from './entities/Tournament';

// Errors
export {
  TournamentError,
  TournamentNotFoundError,
  TournamentAlreadyExistsError,
  ActiveTournamentExistsError,
  GameDateNotFoundError,
  InvalidGameDatesCountError,
} from './errors/TournamentError';
