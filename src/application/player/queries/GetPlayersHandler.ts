import type { PlayerRepository } from '../ports/output/PlayerRepository';
import type {
  GetPlayersUseCase,
  GetPlayersQuery,
  PlayerDTO,
} from '../ports/input/GetPlayersUseCase';

/**
 * Handler for getting players list.
 */
export class GetPlayersHandler implements GetPlayersUseCase {
  constructor(private readonly repository: PlayerRepository) {}

  async execute(query: GetPlayersQuery): Promise<PlayerDTO[]> {
    const players = await this.repository.findAll({
      roles: query.roles,
      search: query.search,
      includeInactive: query.includeInactive,
    });

    return players.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      fullName: p.fullName,
      role: p.role,
      aliases: [...p.aliases],
      primaryAlias: p.primaryAlias,
      photoUrl: p.photoUrl,
      isActive: p.isActive,
      joinYear: p.joinYear,
      inviterId: p.inviterId,
      inviterName: p.inviterName,
      inviteesCount: p.inviteesCount,
    }));
  }
}
