/**
 * Author DTO for proposal response.
 */
export interface ProposalAuthorDTO {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

/**
 * DTO for proposal in list response.
 */
export interface ProposalDTO {
  id: string;
  title: string;
  objective: string;
  situation: string;
  proposal: string;
  imageUrl?: string;
  isActive: boolean;
  createdBy: ProposalAuthorDTO;
  createdAt: Date;
}

/**
 * Response for getting proposals.
 */
export interface GetProposalsResult {
  proposals: ProposalDTO[];
  count: number;
}

/**
 * Use case for retrieving active proposals.
 */
export interface GetProposalsUseCase {
  execute(): Promise<GetProposalsResult>;
}
