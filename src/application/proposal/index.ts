/**
 * Proposal Application Layer - Public API
 */

// Query Handlers
export { GetProposalsHandler } from './queries/GetProposalsHandler';

// Input Ports (Use Cases)
export type {
  GetProposalsUseCase,
  GetProposalsResult,
  ProposalDTO,
  ProposalAuthorDTO,
} from './ports/input/GetProposalsUseCase';

// Output Ports (Repositories)
export type { ProposalRepository } from './ports/output/ProposalRepository';
