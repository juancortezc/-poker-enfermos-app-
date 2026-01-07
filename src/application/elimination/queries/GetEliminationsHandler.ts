import {
  GetEliminationsUseCase,
  GetEliminationsQuery,
  EliminationDTO,
} from '../ports/input/GetEliminationsUseCase';
import { EliminationRepository } from '../ports/output/EliminationRepository';
import { PlayerRepository } from '../ports/output/PlayerRepository';

/**
 * Handles querying eliminations for a game date.
 */
export class GetEliminationsHandler implements GetEliminationsUseCase {
  constructor(
    private readonly eliminationRepository: EliminationRepository,
    private readonly playerRepository: PlayerRepository
  ) {}

  async execute(query: GetEliminationsQuery): Promise<EliminationDTO[]> {
    const eliminations = await this.eliminationRepository.findByGameDateId(query.gameDateId);

    // Map to DTOs with player info
    const results: EliminationDTO[] = [];

    for (const elimination of eliminations) {
      const eliminatedPlayer = await this.playerRepository.findById(
        elimination.eliminatedPlayerId
      );
      const eliminatorPlayer = elimination.eliminatorPlayerId
        ? await this.playerRepository.findById(elimination.eliminatorPlayerId)
        : null;

      if (!eliminatedPlayer) {
        continue; // Skip if player not found (shouldn't happen)
      }

      results.push({
        id: elimination.id!,
        gameDateId: elimination.gameDateId,
        position: elimination.position.value,
        points: elimination.points.value,
        eliminatedPlayer: {
          id: eliminatedPlayer.id,
          firstName: eliminatedPlayer.firstName,
          lastName: eliminatedPlayer.lastName,
        },
        eliminatorPlayer: eliminatorPlayer
          ? {
              id: eliminatorPlayer.id,
              firstName: eliminatorPlayer.firstName,
              lastName: eliminatorPlayer.lastName,
            }
          : null,
        eliminationTime: elimination.eliminationTime.toISOString(),
      });
    }

    return results;
  }
}
