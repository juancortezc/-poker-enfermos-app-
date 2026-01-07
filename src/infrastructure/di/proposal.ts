import { container } from './Container';

// Repository
import { PrismaProposalRepository } from '../persistence/prisma/repositories/PrismaProposalRepository';

// Use Case Handlers
import { GetProposalsHandler } from '@/application/proposal';

// Port types
import type { ProposalRepository, GetProposalsUseCase } from '@/application/proposal';

/**
 * Dependency keys for the Proposal bounded context.
 */
export const PROPOSAL_DEPS = {
  // Repository
  PROPOSAL_REPOSITORY: 'ProposalRepository',

  // Use Cases
  GET_PROPOSALS: 'GetProposalsUseCase',
} as const;

/**
 * Registers all dependencies for the Proposal bounded context.
 */
export function registerProposalDependencies(): void {
  // Register repository
  container.register<ProposalRepository>(
    PROPOSAL_DEPS.PROPOSAL_REPOSITORY,
    () => new PrismaProposalRepository()
  );

  // Register use cases
  container.register<GetProposalsUseCase>(PROPOSAL_DEPS.GET_PROPOSALS, () =>
    new GetProposalsHandler(container.resolve(PROPOSAL_DEPS.PROPOSAL_REPOSITORY))
  );
}

/**
 * Helper function to get typed use case.
 */
export function getGetProposalsUseCase(): GetProposalsUseCase {
  return container.resolve(PROPOSAL_DEPS.GET_PROPOSALS);
}
