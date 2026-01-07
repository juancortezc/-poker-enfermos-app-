/**
 * Author info for a proposal.
 */
export interface ProposalAuthor {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

/**
 * Proposal Entity - Aggregate Root for the Proposal bounded context.
 */
export class Proposal {
  private constructor(
    private readonly _id: string,
    private readonly _title: string,
    private readonly _objective: string,
    private readonly _situation: string,
    private readonly _proposal: string,
    private readonly _imageUrl: string | undefined,
    private readonly _isActive: boolean,
    private readonly _createdBy: ProposalAuthor,
    private readonly _createdAt: Date
  ) {}

  static create(props: {
    id: string;
    title: string;
    objective: string;
    situation: string;
    proposal: string;
    imageUrl?: string;
    isActive: boolean;
    createdBy: ProposalAuthor;
    createdAt: Date;
  }): Proposal {
    return new Proposal(
      props.id,
      props.title,
      props.objective,
      props.situation,
      props.proposal,
      props.imageUrl,
      props.isActive,
      props.createdBy,
      props.createdAt
    );
  }

  get id(): string {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  get objective(): string {
    return this._objective;
  }

  get situation(): string {
    return this._situation;
  }

  get proposal(): string {
    return this._proposal;
  }

  get imageUrl(): string | undefined {
    return this._imageUrl;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdBy(): ProposalAuthor {
    return this._createdBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get authorFullName(): string {
    return `${this._createdBy.firstName} ${this._createdBy.lastName}`;
  }
}
