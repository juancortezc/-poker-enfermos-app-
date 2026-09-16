import {
  GetEliminationsUseCase,
  GetEliminationsQuery,
  EliminationDTO,
} from '../ports/input/GetEliminationsUseCase';
import { EliminationRepository } from '../ports/output/EliminationRepository';
import { PlayerRepository, PlayerInfo } from '../ports/output/PlayerRepository';

/**
 * Handles querying eliminations for a game date.
 *
 * Los jugadores se piden en UNA sola consulta. Antes se hacia un findById por
 * eliminado y otro por eliminador, en secuencia: con 20 jugadores eran ~40
 * viajes a la base en el endpoint mas consultado durante la fecha, y era el
 * primer candidato a pasarse de tiempo y terminar sirviendo cache vieja.
 *
 * El DTO incluye la foto: si no, quien la necesita tiene que cruzarla contra
 * el ranking del torneo, y ahi se pierden los que no son participantes (por
 * ejemplo los invitados), que terminan mostrando iniciales en vez de foto.
 */
export class GetEliminationsHandler implements GetEliminationsUseCase {
  constructor(
    private readonly eliminationRepository: EliminationRepository,
    private readonly playerRepository: PlayerRepository
  ) {}

  async execute(query: GetEliminationsQuery): Promise<EliminationDTO[]> {
    const eliminations = await this.eliminationRepository.findByGameDateId(query.gameDateId);

    const ids = new Set<string>();
    for (const elimination of eliminations) {
      ids.add(elimination.eliminatedPlayerId);
      if (elimination.eliminatorPlayerId) {
        ids.add(elimination.eliminatorPlayerId);
      }
    }

    const players = await this.playerRepository.findByIds([...ids]);
    const byId = new Map<string, PlayerInfo>(players.map((p) => [p.id, p]));

    const toDto = (player: PlayerInfo) => ({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      photoUrl: player.photoUrl ?? null,
    });

    const results: EliminationDTO[] = [];

    for (const elimination of eliminations) {
      const eliminatedPlayer = byId.get(elimination.eliminatedPlayerId);
      const eliminatorPlayer = elimination.eliminatorPlayerId
        ? byId.get(elimination.eliminatorPlayerId)
        : undefined;

      if (!eliminatedPlayer) {
        continue; // Skip if player not found (shouldn't happen)
      }

      results.push({
        id: elimination.id!,
        gameDateId: elimination.gameDateId,
        position: elimination.position.value,
        points: elimination.points.value,
        eliminatedPlayer: toDto(eliminatedPlayer),
        eliminatorPlayer: eliminatorPlayer ? toDto(eliminatorPlayer) : null,
        eliminationTime: elimination.eliminationTime.toISOString(),
      });
    }

    return results;
  }
}
