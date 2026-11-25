import { AppError } from '@/lib/errors';
import { Prisma } from '@prisma/client';
import {
  EliminationError,
  PlayerAlreadyEliminatedError,
  PositionAlreadyTakenError,
  InvalidEliminatorError,
  GameDateNotInProgressError,
  InvalidPositionError,
  EliminationNotFoundError,
  SelfEliminationError,
  PlayerNotInGameDateError,
  PositionNotNextError,
  NotLastEliminationError,
  InvalidEliminationInputError,
  EliminationConflictError,
} from '@/domain/elimination';

/**
 * Traduce los errores de dominio de eliminaciones a AppError, conservando su
 * status (404/409/400) y su `code` estable. La ruta lo lanza y
 * `withErrorHandler` arma la respuesta. Lo que no es de dominio se devuelve
 * tal cual: sale como 500 con mensaje fijo (los mensajes de Prisma traen
 * rutas internas y SQL, y no deben llegar al cliente).
 */
export function toEliminationAppError(error: unknown): unknown {
  // Dos altas a la vez chocaron contra los indices unicos de eliminations.
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    error = new EliminationConflictError();
  }

  if (error instanceof EliminationError) {
    const statusCode = getStatusCodeForError(error);
    if (statusCode >= 500) console.error('[Elimination API Error]', error);
    return new AppError(error.message, statusCode, error.code);
  }

  return error;
}

function getStatusCodeForError(error: EliminationError): number {
  if (error instanceof EliminationNotFoundError) return 404;
  // Conflictos de estado: otro telefono se adelanto o la fecha cambio.
  if (error instanceof PlayerAlreadyEliminatedError) return 409;
  if (error instanceof PositionAlreadyTakenError) return 409;
  if (error instanceof PositionNotNextError) return 409;
  if (error instanceof NotLastEliminationError) return 409;
  if (error instanceof EliminationConflictError) return 409;
  if (error instanceof GameDateNotInProgressError) return 409;
  // Datos invalidos.
  if (error instanceof InvalidEliminatorError) return 400;
  if (error instanceof InvalidPositionError) return 400;
  if (error instanceof SelfEliminationError) return 400;
  if (error instanceof PlayerNotInGameDateError) return 400;
  if (error instanceof InvalidEliminationInputError) return 400;
  return 500;
}
