import { container } from './Container';

// Repository
import { PrismaTimerRepository } from '../persistence/prisma/repositories/PrismaTimerRepository';

// Use Case Handlers
import { GetTimerStateHandler } from '@/application/timer';

// Port types
import type { TimerRepository, GetTimerStateUseCase } from '@/application/timer';

/**
 * Dependency keys for the Timer bounded context.
 */
export const TIMER_DEPS = {
  // Repository
  TIMER_REPOSITORY: 'TimerRepository',

  // Use Cases
  GET_TIMER_STATE: 'GetTimerStateUseCase',
} as const;

/**
 * Registers all dependencies for the Timer bounded context.
 */
export function registerTimerDependencies(): void {
  // Register repository
  container.register<TimerRepository>(
    TIMER_DEPS.TIMER_REPOSITORY,
    () => new PrismaTimerRepository()
  );

  // Register use cases
  container.register<GetTimerStateUseCase>(TIMER_DEPS.GET_TIMER_STATE, () =>
    new GetTimerStateHandler(container.resolve(TIMER_DEPS.TIMER_REPOSITORY))
  );
}

/**
 * Helper function to get typed use case.
 */
export function getGetTimerStateUseCase(): GetTimerStateUseCase {
  return container.resolve(TIMER_DEPS.GET_TIMER_STATE);
}
