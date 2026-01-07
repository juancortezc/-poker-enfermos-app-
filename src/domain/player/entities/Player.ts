/**
 * Player role enum.
 */
export type PlayerRole = 'Comision' | 'Fundador' | 'Socio' | 'Invitado';

/**
 * Player Entity - Aggregate Root for the Player bounded context.
 */
export class Player {
  private constructor(
    private readonly _id: string,
    private readonly _firstName: string,
    private readonly _lastName: string,
    private readonly _role: PlayerRole,
    private readonly _aliases: string[],
    private readonly _photoUrl: string | undefined,
    private readonly _isActive: boolean,
    private readonly _joinYear: number,
    private readonly _inviterId: string | undefined,
    private readonly _inviterName: string | undefined,
    private readonly _inviteesCount: number
  ) {}

  static create(props: {
    id: string;
    firstName: string;
    lastName: string;
    role: PlayerRole;
    aliases: string[];
    photoUrl?: string;
    isActive: boolean;
    joinYear: number;
    inviterId?: string;
    inviterName?: string;
    inviteesCount: number;
  }): Player {
    return new Player(
      props.id,
      props.firstName,
      props.lastName,
      props.role,
      props.aliases,
      props.photoUrl,
      props.isActive,
      props.joinYear,
      props.inviterId,
      props.inviterName,
      props.inviteesCount
    );
  }

  get id(): string {
    return this._id;
  }

  get firstName(): string {
    return this._firstName;
  }

  get lastName(): string {
    return this._lastName;
  }

  get fullName(): string {
    return `${this._firstName} ${this._lastName}`;
  }

  get role(): PlayerRole {
    return this._role;
  }

  get aliases(): readonly string[] {
    return this._aliases;
  }

  get primaryAlias(): string | undefined {
    return this._aliases[0];
  }

  get photoUrl(): string | undefined {
    return this._photoUrl;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get joinYear(): number {
    return this._joinYear;
  }

  get inviterId(): string | undefined {
    return this._inviterId;
  }

  get inviterName(): string | undefined {
    return this._inviterName;
  }

  get inviteesCount(): number {
    return this._inviteesCount;
  }

  isGuest(): boolean {
    return this._role === 'Invitado';
  }

  isCommissionMember(): boolean {
    return this._role === 'Comision';
  }

  isFounder(): boolean {
    return this._role === 'Fundador';
  }

  isMember(): boolean {
    return this._role === 'Socio';
  }
}
