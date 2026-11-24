import { NextResponse } from 'next/server';
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
 * Maps domain errors to HTTP responses.
 *
 * Todo lo que no es un error de dominio sale como 500 con un mensaje fijo: los
 * mensajes de Prisma traen rutas internas y SQL, y no deben llegar al cliente.
 */
export function handleEliminationError(error: unknown): NextResponse {
  // Dos altas a la vez chocaron contra los indices unicos de eliminations.
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    error = new EliminationConflictError();
  }

  if (error instanceof EliminationError) {
    const statusCode = getStatusCodeForError(error);
    if (statusCode >= 500) console.error('[Elimination API Error]', error);
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: statusCode }
    );
  }

  console.error('[Elimination API Error]', error);
  return NextResponse.json(
    { error: 'Error interno registrando la eliminación', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
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
