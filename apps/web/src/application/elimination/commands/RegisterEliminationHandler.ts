import {
  Elimination,
  PlayerAlreadyEliminatedError,
  PositionAlreadyTakenError,
  InvalidEliminatorError,
  GameDateNotInProgressError,
  EliminationNotFoundError,
  SelfEliminationError,
  PlayerNotInGameDateError,
  PositionNotNextError,
} from '@/domain/elimination';
import {
  RegisterEliminationUseCase,
  RegisterEliminationCommand,
  EliminationResult,
} from '../ports/input/RegisterEliminationUseCase';
import { EliminationRepository } from '../ports/output/EliminationRepository';
import { GameDateRepository, GameDateInfo } from '../ports/output/GameDateRepository';
import { PlayerRepository } from '../ports/output/PlayerRepository';
import { NotificationService } from '../ports/output/NotificationService';
import { ParentChildStatsService } from '../ports/output/ParentChildStatsService';

/** Lo que deja la parte transaccional del alta. */
interface LockedResult {
  gameDate: GameDateInfo;
  savedElimination: Elimination;
  /**
   * Ganador guardado por el cierre automatico (posicion 2 con eliminador),
   * 'skipped' si faltaban eliminaciones, o null si no aplica.
   */
  autoComplete: Elimination | 'skipped' | null;
}

/**
 * Handles the registration of a new player elimination.
 *
 * Orchestrates:
 * 1. Validation of business rules and persistence, atomically with the game
 *    date locked (two phones registering at once run one after the other)
 * 2. Side effects (notifications, stats) after the commit
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
    const { gameDate, savedElimination, autoComplete } = await this.gameDateRepository.runLocked(
      command.gameDateId,
      () => this.registerLocked(command)
    );

    // Efectos secundarios: despues del commit, para no alargar el bloqueo ni
    // notificar algo que despues se deshace.
    const eliminatedPlayer = await this.playerRepository.findById(command.eliminatedPlayerId);
    const hasEliminator =
      Boolean(command.eliminatorPlayerId) && command.eliminatorPlayerId !== command.eliminatedPlayerId;
    const eliminatorPlayer = command.eliminatorPlayerId
      ? await this.playerRepository.findById(command.eliminatorPlayerId)
      : null;

    if (!eliminatedPlayer) {
      throw new EliminationNotFoundError('player');
    }

    if (savedElimination.isWinner()) {
      await this.handleWinner(
        command.eliminatedPlayerId,
        eliminatedPlayer,
        gameDate.scheduledDate,
        savedElimination.points.value,
        command.gameDateId
      );
    } else {
      await this.notificationService.notifyPlayerEliminated({
        playerId: command.eliminatedPlayerId,
        playerName: `${eliminatedPlayer.firstName} ${eliminatedPlayer.lastName}`,
        position: command.position,
        points: savedElimination.points.value,
        gameDateId: command.gameDateId,
        eliminatorName: eliminatorPlayer
          ? `${eliminatorPlayer.firstName} ${eliminatorPlayer.lastName}`
          : undefined,
      });
    }

    if (hasEliminator && command.eliminatorPlayerId) {
      await this.parentChildStatsService.updateStats({
        tournamentId: gameDate.tournamentId,
        eliminatorId: command.eliminatorPlayerId,
        eliminatedId: command.eliminatedPlayerId,
        gameDateDate: gameDate.scheduledDate,
        position: savedElimination.position.value,
      });
    }

    let winnerResult: EliminationResult | undefined;
    let autoCompleteError: string | undefined;
    if (autoComplete === 'skipped') {
      // La posicion 2 si se guardo, pero la fecha no se cerro. Se reporta
      // para que la Comision lo vea y no quede colgada en in_progress.
      autoCompleteError =
        'La eliminación se guardó, pero la fecha no se pudo cerrar automáticamente. Ciérrala a mano.';
    } else if (autoComplete) {
      winnerResult = await this.afterAutoComplete(autoComplete, gameDate);
    }

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
      triggeredAutoComplete: Boolean(winnerResult),
      autoCompleteError,
      winnerElimination: winnerResult,
    };
  }

  /** Validaciones y escrituras. Corre dentro de la transaccion, con la fecha bloqueada. */
  private async registerLocked(command: RegisterEliminationCommand): Promise<LockedResult> {
    // 1. La fecha existe y esta en curso
    const gameDate = await this.gameDateRepository.findById(command.gameDateId);
    if (!gameDate) {
      throw new EliminationNotFoundError('gameDate');
    }
    if (gameDate.status !== 'in_progress') {
      throw new GameDateNotInProgressError(command.gameDateId, gameDate.status);
    }

    // 2. Los dos jugadores estan en la fecha y no son el mismo (salvo el
    // ganador en la posicion 1, que por convencion se "elimina" solo).
    if (!gameDate.playerIds.includes(command.eliminatedPlayerId)) {
      throw new PlayerNotInGameDateError(command.eliminatedPlayerId, 'eliminated');
    }
    if (command.eliminatorPlayerId) {
      if (!gameDate.playerIds.includes(command.eliminatorPlayerId)) {
        throw new PlayerNotInGameDateError(command.eliminatorPlayerId, 'eliminator');
      }
      if (command.eliminatorPlayerId === command.eliminatedPlayerId && command.position !== 1) {
        throw new SelfEliminationError();
      }
    }

    // 3. Entidad (valida el rango de la posicion y calcula los puntos)
    const totalPlayers = gameDate.playerIds.length;
    const elimination = Elimination.create({
      gameDateId: command.gameDateId,
      position: command.position,
      totalPlayers,
      eliminatedPlayerId: command.eliminatedPlayerId,
      eliminatorPlayerId: command.eliminatorPlayerId,
      eliminationTime: new Date(),
    });

    // 4. El eliminado no salio antes
    const alreadyEliminated = await this.eliminationRepository.existsByPlayerInGameDate(
      command.eliminatedPlayerId,
      command.gameDateId
    );
    if (alreadyEliminated) {
      throw new PlayerAlreadyEliminatedError(command.eliminatedPlayerId);
    }

    // 5. La posicion esta libre y es la siguiente (se llena del ultimo
    // puesto hacia arriba, sin huecos)
    const positionTaken = await this.eliminationRepository.existsByPositionInGameDate(
      command.position,
      command.gameDateId
    );
    if (positionTaken) {
      throw new PositionAlreadyTakenError(command.position);
    }
    const lowest = await this.eliminationRepository.findLowestPosition(command.gameDateId);
    const expected = (lowest ?? totalPlayers + 1) - 1;
    if (command.position !== expected) {
      throw new PositionNotNextError(command.position, expected);
    }

    // 6. El eliminador no salio antes de esta posicion
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

    // 7. Guardar, y cerrar la fecha si corresponde
    const savedElimination = await this.eliminationRepository.save(elimination);

    let autoComplete: LockedResult['autoComplete'] = null;
    if (savedElimination.isWinner()) {
      await this.gameDateRepository.markAsCompleted(command.gameDateId);
    } else if (savedElimination.isRunnerUp() && command.eliminatorPlayerId) {
      autoComplete = await this.autoCompleteLocked(
        savedElimination,
        command.eliminatorPlayerId,
        totalPlayers,
        gameDate.id
      );
    }

    return { gameDate, savedElimination, autoComplete };
  }

  /**
   * Posicion 2 con eliminador: ese eliminador gana. Guarda la posicion 1 y
   * cierra la fecha en la misma transaccion.
   */
  private async autoCompleteLocked(
    runnerUpElimination: Elimination,
    winnerId: string,
    totalPlayers: number,
    gameDateId: number
  ): Promise<Elimination | 'skipped'> {
    const eliminationCount = await this.eliminationRepository.countByGameDateId(gameDateId);
    const expectedBeforeWinner = totalPlayers - 1;
    if (eliminationCount !== expectedBeforeWinner) {
      console.log(
        `[AutoComplete] GameDate ${gameDateId}: eliminationCount=${eliminationCount}, expected=${expectedBeforeWinner} - skipping`
      );
      return 'skipped';
    }

    const winnerElimination = runnerUpElimination.createWinnerElimination(winnerId, totalPlayers);
    const savedWinner = await this.eliminationRepository.save(winnerElimination);
    await this.gameDateRepository.markAsCompleted(gameDateId);
    return savedWinner;
  }

  /** Efectos del ganador auto-registrado, ya fuera de la transaccion. */
  private async afterAutoComplete(
    savedWinner: Elimination,
    gameDate: GameDateInfo
  ): Promise<EliminationResult | undefined> {
    const winnerId = savedWinner.eliminatedPlayerId;
    const winnerPlayer = await this.playerRepository.findById(winnerId);
    if (!winnerPlayer) return undefined;

    try {
      await this.handleWinner(
        winnerId,
        winnerPlayer,
        gameDate.scheduledDate,
        savedWinner.points.value,
        gameDate.id
      );
    } catch (error) {
      // El ganador y el cierre ya estan guardados: un fallo de notificacion
      // no los revierte.
      console.error(`[AutoComplete] winner side effects failed for gameDate ${gameDate.id}:`, error);
    }

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
}
