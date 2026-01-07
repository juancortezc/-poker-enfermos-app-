import type { ProposalRepository } from '../ports/output/ProposalRepository';
import type {
  GetProposalsUseCase,
  GetProposalsResult,
  ProposalDTO,
} from '../ports/input/GetProposalsUseCase';

/**
 * Handler for getting active proposals.
 */
export class GetProposalsHandler implements GetProposalsUseCase {
  constructor(private readonly repository: ProposalRepository) {}

  async execute(): Promise<GetProposalsResult> {
    const proposals = await this.repository.findAllActive();

    const proposalDTOs: ProposalDTO[] = proposals.map((p) => ({
      id: p.id,
      title: p.title,
      objective: p.objective,
      situation: p.situation,
      proposal: p.proposal,
      imageUrl: p.imageUrl,
      isActive: p.isActive,
      createdBy: {
        id: p.createdBy.id,
        firstName: p.createdBy.firstName,
        lastName: p.createdBy.lastName,
        role: p.createdBy.role,
      },
      createdAt: p.createdAt,
    }));

    return {
      proposals: proposalDTOs,
      count: proposalDTOs.length,
    };
  }
}
