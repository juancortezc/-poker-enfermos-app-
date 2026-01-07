import type { PlayerRole } from '@/domain/player';

/**
 * DTO for player in list response.
 */
export interface PlayerDTO {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: PlayerRole;
  aliases: string[];
  primaryAlias?: string;
  photoUrl?: string;
  isActive: boolean;
  joinYear: number;
  inviterId?: string;
  inviterName?: string;
  inviteesCount: number;
}

/**
 * Query parameters for getting players.
 */
export interface GetPlayersQuery {
  roles?: PlayerRole[];
  search?: string;
  includeInactive?: boolean;
}

/**
 * Use case for retrieving players list.
 */
export interface GetPlayersUseCase {
  execute(query: GetPlayersQuery): Promise<PlayerDTO[]>;
}
