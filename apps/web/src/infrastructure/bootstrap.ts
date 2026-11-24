import { registerEliminationDependencies } from './di/elimination';
import { registerTournamentDependencies } from './di/tournament';
import { registerPlayerDependencies } from './di/player';

let initialized = false;

/**
 * Initializes all infrastructure dependencies.
 * Should be called once at application startup.
 *
 * This function is idempotent - calling it multiple times has no effect.
 */
export function bootstrapInfrastructure(): void {
  if (initialized) {
    return;
  }

  // Register Elimination bounded context
  registerEliminationDependencies();


  // Register Tournament bounded context
  registerTournamentDependencies();

  // Register Player bounded context
  registerPlayerDependencies();



  initialized = true;
  console.log('[Infrastructure] Dependencies registered');
}

/**
 * Resets initialization state (for testing only).
 */
export function resetInfrastructure(): void {
  initialized = false;
}
