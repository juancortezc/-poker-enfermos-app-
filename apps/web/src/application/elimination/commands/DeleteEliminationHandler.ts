import {
  GameDateNotInProgressError,
  EliminationNotFoundError,
  NotLastEliminationError,
} from '@/domain/elimination';
import {
  DeleteEliminationUseCase,
  DeleteEliminationCommand,
} from '../ports/input/DeleteEliminationUseCase';
import { EliminationRepository } from '../ports/output/EliminationRepository';
import { GameDateRepository } from '../ports/output/GameDateRepository';

/**
 * Handles deleting an elimination.
 * Only allows deleting the most recent elimination in a game date.
 */
export class DeleteEliminationHandler implements DeleteEliminationUseCase {
  constructor(
    private readonly eliminationRepository: EliminationRepository,
    private readonly gameDateRepository: GameDateRepository
  ) {}

  async execute(command: DeleteEliminationCommand): Promise<void> {
    // 1. Find existing elimination
    const existing = await this.eliminationRepository.findById(command.eliminationId);
    if (!existing) {
      throw new EliminationNotFoundError('elimination');
    }

    // Con la fecha bloqueada: no se cruza con un alta simultanea.
    await this.gameDateRepository.runLocked(existing.gameDateId, async () => {
      // 2. Validate game date is in progress
      const gameDate = await this.gameDateRepository.findById(existing.gameDateId);
      if (!gameDate) {
        throw new EliminationNotFoundError('gameDate');
      }
      if (gameDate.status !== 'in_progress') {
        throw new GameDateNotInProgressError(existing.gameDateId, gameDate.status);
      }

      // 3. Check no later eliminations exist (lower position number = happened after)
      const hasLaterEliminations = await this.eliminationRepository.existsLaterEliminations(
        existing.gameDateId,
        existing.position.value
      );
      if (hasLaterEliminations) {
        throw new NotLastEliminationError();
      }

      // 4. Delete
      await this.eliminationRepository.delete(existing.id!);
    });
  }
}
