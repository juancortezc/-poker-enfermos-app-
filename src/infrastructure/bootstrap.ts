import { registerEliminationDependencies } from './di/elimination';
import { registerRankingDependencies } from './di/ranking';
import { registerTournamentDependencies } from './di/tournament';
import { registerPlayerDependencies } from './di/player';
import { registerTimerDependencies } from './di/timer';
import { registerProposalDependencies } from './di/proposal';

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

  // Register Ranking bounded context
  registerRankingDependencies();

  // Register Tournament bounded context
  registerTournamentDependencies();

  // Register Player bounded context
  registerPlayerDependencies();

  // Register Timer bounded context
  registerTimerDependencies();

  // Register Proposal bounded context
  registerProposalDependencies();

  initialized = true;
  console.log('[Infrastructure] Dependencies registered');
}

/**
 * Resets initialization state (for testing only).
 */
export function resetInfrastructure(): void {
  initialized = false;
}
