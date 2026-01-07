/**
 * Proposal Domain - Public API
 */

// Entities
export { Proposal, type ProposalAuthor } from './entities/Proposal';

// Errors
export {
  ProposalError,
  ProposalNotFoundError,
  InvalidProposalDataError,
  ProposalTitleTooLongError,
  ProposalObjectiveTooLongError,
  ProposalSituationTooLongError,
  ProposalTextTooLongError,
  InvalidImageUrlError,
} from './errors/ProposalError';
