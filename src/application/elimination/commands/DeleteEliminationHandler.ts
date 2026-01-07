import { GameDateNotInProgressError } from '@/domain/elimination';
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
      throw new Error(`Elimination ${command.eliminationId} not found`);
    }

    // 2. Validate game date is in progress
    const gameDate = await this.gameDateRepository.findById(existing.gameDateId);
    if (!gameDate) {
      throw new Error(`Game date ${existing.gameDateId} not found`);
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
      throw new Error(
        'Cannot delete - there are eliminations that occurred after this one. Delete those first.'
      );
    }

    // 4. Delete
    await this.eliminationRepository.delete(existing.id!);
  }
}
