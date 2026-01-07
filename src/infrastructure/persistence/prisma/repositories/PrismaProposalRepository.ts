import { prisma } from '@/lib/prisma';
import type { ProposalRepository } from '@/application/proposal';
import { Proposal, type ProposalAuthor } from '@/domain/proposal';

/**
 * Prisma implementation of ProposalRepository.
 */
export class PrismaProposalRepository implements ProposalRepository {
  async findAllActive(): Promise<Proposal[]> {
    const proposals = await prisma.proposalV2.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    return proposals.map((p) => this.toDomain(p));
  }

  async findById(id: string): Promise<Proposal | null> {
    const proposal = await prisma.proposalV2.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    return proposal ? this.toDomain(proposal) : null;
  }

  private toDomain(data: {
    id: string;
    title: string;
    objective: string;
    situation: string;
    proposal: string;
    imageUrl: string | null;
    isActive: boolean;
    createdAt: Date;
    createdBy: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
    } | null;
  }): Proposal {
    const author: ProposalAuthor = data.createdBy
      ? {
          id: data.createdBy.id,
          firstName: data.createdBy.firstName,
          lastName: data.createdBy.lastName,
          role: data.createdBy.role,
        }
      : {
          id: 'unknown',
          firstName: 'Unknown',
          lastName: 'Author',
          role: 'unknown',
        };

    return Proposal.create({
      id: data.id,
      title: data.title,
      objective: data.objective,
      situation: data.situation,
      proposal: data.proposal,
      imageUrl: data.imageUrl ?? undefined,
      isActive: data.isActive,
      createdBy: author,
      createdAt: data.createdAt,
    });
  }
}
