/**
 * Timer Domain - Public API
 */

// Entities
export {
  TimerState,
  type TimerStatus,
  type ComputedTimerState,
  type RawTimerState,
} from './entities/TimerState';

// Value Objects
export { TimeDisplay } from './value-objects/TimeDisplay';

// Errors
export {
  TimerError,
  TimerNotFoundError,
  TimerAlreadyActiveError,
  TimerNotActiveError,
  InvalidLevelError,
} from './errors/TimerError';
