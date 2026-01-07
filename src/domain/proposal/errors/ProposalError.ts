/**
 * Base class for all proposal domain errors.
 */
export abstract class ProposalError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ProposalNotFoundError extends ProposalError {
  readonly code = 'PROPOSAL_NOT_FOUND';

  constructor(public readonly proposalId: string) {
    super(`Proposal ${proposalId} not found`);
  }
}

export class InvalidProposalDataError extends ProposalError {
  readonly code = 'INVALID_PROPOSAL_DATA';

  constructor(message: string) {
    super(message);
  }
}

export class ProposalTitleTooLongError extends ProposalError {
  readonly code = 'PROPOSAL_TITLE_TOO_LONG';

  constructor() {
    super('El título no puede exceder 200 caracteres');
  }
}

export class ProposalObjectiveTooLongError extends ProposalError {
  readonly code = 'PROPOSAL_OBJECTIVE_TOO_LONG';

  constructor() {
    super('El objetivo no puede exceder 1000 caracteres');
  }
}

export class ProposalSituationTooLongError extends ProposalError {
  readonly code = 'PROPOSAL_SITUATION_TOO_LONG';

  constructor() {
    super('La situación a modificar no puede exceder 2000 caracteres');
  }
}

export class ProposalTextTooLongError extends ProposalError {
  readonly code = 'PROPOSAL_TEXT_TOO_LONG';

  constructor() {
    super('La propuesta no puede exceder 3000 caracteres');
  }
}

export class InvalidImageUrlError extends ProposalError {
  readonly code = 'INVALID_IMAGE_URL';

  constructor() {
    super('La URL de la imagen no es válida');
  }
}
