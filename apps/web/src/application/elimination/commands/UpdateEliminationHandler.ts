import {
  Elimination,
  PlayerAlreadyEliminatedError,
  InvalidEliminatorError,
  GameDateNotInProgressError,
  EliminationNotFoundError,
  SelfEliminationError,
  PlayerNotInGameDateError,
} from '@/domain/elimination';
import {
  UpdateEliminationUseCase,
  UpdateEliminationCommand,
} from '../ports/input/UpdateEliminationUseCase';
import { EliminationDTO } from '../ports/input/GetEliminationsUseCase';
import { EliminationRepository } from '../ports/output/EliminationRepository';
import { GameDateRepository } from '../ports/output/GameDateRepository';
import { PlayerRepository } from '../ports/output/PlayerRepository';

/**
 * Handles updating an existing elimination.
 * Only allows changing player assignments, not position or points.
 */
export class UpdateEliminationHandler implements UpdateEliminationUseCase {
  constructor(
    private readonly eliminationRepository: EliminationRepository,
    private readonly gameDateRepository: GameDateRepository,
    private readonly playerRepository: PlayerRepository
  ) {}

  async execute(command: UpdateEliminationCommand): Promise<EliminationDTO> {
    // 1. Find existing elimination
    const existing = await this.eliminationRepository.findById(command.eliminationId);
    if (!existing) {
      throw new EliminationNotFoundError('elimination');
    }

    const saved = await this.gameDateRepository.runLocked(existing.gameDateId, () =>
      this.updateLocked(existing, command)
    );

    const eliminatedPlayer = await this.playerRepository.findById(saved.eliminatedPlayerId);
    const eliminatorPlayer = saved.eliminatorPlayerId
      ? await this.playerRepository.findById(saved.eliminatorPlayerId)
      : null;

    if (!eliminatedPlayer) {
      throw new EliminationNotFoundError('player');
    }

    return {
      id: saved.id!,
      gameDateId: saved.gameDateId,
      position: saved.position.value,
      points: saved.points.value,
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
      eliminationTime: saved.eliminationTime.toISOString(),
    };
  }

  private async updateLocked(
    existing: Elimination,
    command: UpdateEliminationCommand
  ): Promise<Elimination> {
    // 2. Validate game date is in progress
    const gameDate = await this.gameDateRepository.findById(existing.gameDateId);
    if (!gameDate) {
      throw new EliminationNotFoundError('gameDate');
    }
    if (gameDate.status !== 'in_progress') {
      throw new GameDateNotInProgressError(existing.gameDateId, gameDate.status);
    }

    // 3. Validate new eliminated player (if changing)
    const newEliminatedId = command.eliminatedPlayerId ?? existing.eliminatedPlayerId;
    if (command.eliminatedPlayerId && command.eliminatedPlayerId !== existing.eliminatedPlayerId) {
      if (!gameDate.playerIds.includes(command.eliminatedPlayerId)) {
        throw new PlayerNotInGameDateError(command.eliminatedPlayerId, 'eliminated');
      }
      const alreadyEliminated = await this.eliminationRepository.findByPlayerInGameDate(
        command.eliminatedPlayerId,
        existing.gameDateId
      );
      if (alreadyEliminated && alreadyEliminated.id !== existing.id) {
        throw new PlayerAlreadyEliminatedError(command.eliminatedPlayerId);
      }
    }

    // 4. Validate new eliminator (if changing). En la base "sin eliminador" se
    // guarda como el propio eliminado; si se cambia el eliminado, ese
    // "sin eliminador" se conserva en vez de apuntar al jugador anterior.
    const existingEliminator =
      existing.eliminatorPlayerId === existing.eliminatedPlayerId ? null : existing.eliminatorPlayerId;
    const newEliminatorId =
      command.eliminatorPlayerId !== undefined ? command.eliminatorPlayerId : existingEliminator;

    if (newEliminatorId) {
      if (newEliminatorId === newEliminatedId && existing.position.value !== 1) {
        throw new SelfEliminationError();
      }
      if (!gameDate.playerIds.includes(newEliminatorId)) {
        throw new PlayerNotInGameDateError(newEliminatorId, 'eliminator');
      }
      const eliminatorElimination = await this.eliminationRepository.findByPlayerInGameDate(
        newEliminatorId,
        existing.gameDateId
      );
      if (
        eliminatorElimination &&
        eliminatorElimination.id !== existing.id &&
        eliminatorElimination.position.value > existing.position.value
      ) {
        throw new InvalidEliminatorError(
          newEliminatorId,
          eliminatorElimination.position.value
        );
      }
    }

    // 5. Reconstitute with updated values and save
    const updated = Elimination.reconstitute({
      id: existing.id!,
      gameDateId: existing.gameDateId,
      position: existing.position,
      points: existing.points,
      eliminatedPlayerId: newEliminatedId,
      eliminatorPlayerId: newEliminatorId,
      eliminationTime: existing.eliminationTime,
    });

    return this.eliminationRepository.update(updated);
  }
}
