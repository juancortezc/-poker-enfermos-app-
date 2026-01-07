import {
  Elimination,
  PlayerAlreadyEliminatedError,
  PositionAlreadyTakenError,
  InvalidEliminatorError,
  GameDateNotInProgressError,
} from '@/domain/elimination';
import {
  RegisterEliminationUseCase,
  RegisterEliminationCommand,
  EliminationResult,
} from '../ports/input/RegisterEliminationUseCase';
import { EliminationRepository } from '../ports/output/EliminationRepository';
import { GameDateRepository } from '../ports/output/GameDateRepository';
import { PlayerRepository } from '../ports/output/PlayerRepository';
import { NotificationService } from '../ports/output/NotificationService';
import { ParentChildStatsService } from '../ports/output/ParentChildStatsService';

/**
 * Handles the registration of a new player elimination.
 *
 * Orchestrates:
 * 1. Validation of business rules
 * 2. Creation and persistence of elimination
 * 3. Side effects (notifications, stats, auto-complete)
 */
export class RegisterEliminationHandler implements RegisterEliminationUseCase {
  constructor(
    private readonly eliminationRepository: EliminationRepository,
    private readonly gameDateRepository: GameDateRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly notificationService: NotificationService,
    private readonly parentChildStatsService: ParentChildStatsService
  ) {}

  async execute(command: RegisterEliminationCommand): Promise<EliminationResult> {
    // 1. Validate game date exists and is in progress
    const gameDate = await this.gameDateRepository.findById(command.gameDateId);
    if (!gameDate) {
      throw new Error(`Game date ${command.gameDateId} not found`);
    }
    if (gameDate.status !== 'in_progress') {
      throw new GameDateNotInProgressError(command.gameDateId, gameDate.status);
    }

    // 2. Validate player not already eliminated
    const alreadyEliminated = await this.eliminationRepository.existsByPlayerInGameDate(
      command.eliminatedPlayerId,
      command.gameDateId
    );
    if (alreadyEliminated) {
      throw new PlayerAlreadyEliminatedError(command.eliminatedPlayerId);
    }

    // 3. Validate position not taken
    const positionTaken = await this.eliminationRepository.existsByPositionInGameDate(
      command.position,
      command.gameDateId
    );
    if (positionTaken) {
      throw new PositionAlreadyTakenError(command.position);
    }

    // 4. Validate eliminator not eliminated before this position
    if (command.eliminatorPlayerId) {
      const eliminatorElimination = await this.eliminationRepository.findByPlayerInGameDate(
        command.eliminatorPlayerId,
        command.gameDateId
      );
      if (eliminatorElimination && eliminatorElimination.position.value > command.position) {
        throw new InvalidEliminatorError(
          command.eliminatorPlayerId,
          eliminatorElimination.position.value
        );
      }
    }

    // 5. Create elimination entity
    const totalPlayers = gameDate.playerIds.length;
    const elimination = Elimination.create({
      gameDateId: command.gameDateId,
      position: command.position,
      totalPlayers,
      eliminatedPlayerId: command.eliminatedPlayerId,
      eliminatorPlayerId: command.eliminatorPlayerId,
      eliminationTime: new Date(),
    });

    // 6. Save elimination
    const savedElimination = await this.eliminationRepository.save(elimination);

    // 7. Get player info for response and notifications
    const eliminatedPlayer = await this.playerRepository.findById(command.eliminatedPlayerId);
    const eliminatorPlayer = command.eliminatorPlayerId
      ? await this.playerRepository.findById(command.eliminatorPlayerId)
      : null;

    if (!eliminatedPlayer) {
      throw new Error(`Eliminated player ${command.eliminatedPlayerId} not found`);
    }

    // 8. Handle winner case (position 1)
    if (savedElimination.isWinner()) {
      await this.handleWinner(
        command.eliminatedPlayerId,
        eliminatedPlayer,
        gameDate.scheduledDate,
        savedElimination.points.value,
        command.gameDateId
      );
    } else {
      // Send elimination notification
      await this.notificationService.notifyPlayerEliminated({
        playerId: command.eliminatedPlayerId,
        playerName: `${eliminatedPlayer.firstName} ${eliminatedPlayer.lastName}`,
        position: command.position,
        points: savedElimination.points.value,
        gameDateId: command.gameDateId,
      });
    }

    // 9. Update parent-child stats if there's an eliminator
    if (command.eliminatorPlayerId) {
      await this.parentChildStatsService.updateStats({
        tournamentId: gameDate.tournamentId,
        eliminatorId: command.eliminatorPlayerId,
        eliminatedId: command.eliminatedPlayerId,
        gameDateDate: gameDate.scheduledDate,
      });
    }

    // 10. Check for auto-complete (position 2 with eliminator)
    let winnerResult: EliminationResult | undefined;
    let triggeredAutoComplete = false;

    if (savedElimination.isRunnerUp() && command.eliminatorPlayerId) {
      const autoCompleteResult = await this.handleAutoComplete(
        savedElimination,
        command.eliminatorPlayerId,
        totalPlayers,
        gameDate
      );
      if (autoCompleteResult) {
        triggeredAutoComplete = true;
        winnerResult = autoCompleteResult;
      }
    }

    // 11. Build and return result
    return {
      id: savedElimination.id!,
      gameDateId: savedElimination.gameDateId,
      position: savedElimination.position.value,
      points: savedElimination.points.value,
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
      eliminationTime: savedElimination.eliminationTime.toISOString(),
      triggeredAutoComplete,
      winnerElimination: winnerResult,
    };
  }

  private async handleWinner(
    playerId: string,
    player: { firstName: string; lastName: string },
    scheduledDate: Date,
    points: number,
    gameDateId: number
  ): Promise<void> {
    // Update last victory date
    const victoryDate = scheduledDate.toLocaleDateString('es-EC');
    await this.playerRepository.updateLastVictoryDate(playerId, victoryDate);

    // Send winner notification
    await this.notificationService.notifyWinnerDeclared({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      points,
      gameDateId,
    });
  }

  private async handleAutoComplete(
    runnerUpElimination: Elimination,
    winnerId: string,
    totalPlayers: number,
    gameDate: { id: number; scheduledDate: Date; tournamentId: number }
  ): Promise<EliminationResult | null> {
    // Check if we have all eliminations except winner
    const eliminationCount = await this.eliminationRepository.countByGameDateId(gameDate.id);
    const expectedBeforeWinner = totalPlayers - 1;

    if (eliminationCount !== expectedBeforeWinner) {
      return null;
    }

    // Create winner elimination
    const winnerElimination = runnerUpElimination.createWinnerElimination(winnerId, totalPlayers);
    const savedWinner = await this.eliminationRepository.save(winnerElimination);

    // Get winner player info
    const winnerPlayer = await this.playerRepository.findById(winnerId);
    if (!winnerPlayer) {
      throw new Error(`Winner player ${winnerId} not found`);
    }

    // Handle winner side effects
    await this.handleWinner(
      winnerId,
      winnerPlayer,
      gameDate.scheduledDate,
      savedWinner.points.value,
      gameDate.id
    );

    // Mark game date as completed
    await this.gameDateRepository.markAsCompleted(gameDate.id);

    return {
      id: savedWinner.id!,
      gameDateId: savedWinner.gameDateId,
      position: savedWinner.position.value,
      points: savedWinner.points.value,
      eliminatedPlayer: {
        id: winnerPlayer.id,
        firstName: winnerPlayer.firstName,
        lastName: winnerPlayer.lastName,
      },
      eliminatorPlayer: {
        id: winnerPlayer.id,
        firstName: winnerPlayer.firstName,
        lastName: winnerPlayer.lastName,
      },
      eliminationTime: savedWinner.eliminationTime.toISOString(),
      triggeredAutoComplete: false,
    };
  }
}
