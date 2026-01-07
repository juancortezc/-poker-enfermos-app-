import type { Proposal } from '@/domain/proposal';

/**
 * Output port for proposal data access.
 */
export interface ProposalRepository {
  /**
   * Find all active proposals.
   */
  findAllActive(): Promise<Proposal[]>;

  /**
   * Find a proposal by ID.
   */
  findById(id: string): Promise<Proposal | null>;
}
