import { NextResponse } from 'next/server';
import {
  EliminationError,
  PlayerAlreadyEliminatedError,
  PositionAlreadyTakenError,
  InvalidEliminatorError,
  GameDateNotInProgressError,
  InvalidPositionError,
} from '@/domain/elimination';

/**
 * Maps domain errors to HTTP responses.
 */
export function handleEliminationError(error: unknown): NextResponse {
  console.error('[Elimination API Error]', error);

  if (error instanceof EliminationError) {
    const statusCode = getStatusCodeForError(error);
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: statusCode }
    );
  }

  // Generic errors
  if (error instanceof Error) {
    // Not found errors
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: 'An unexpected error occurred' },
    { status: 500 }
  );
}

function getStatusCodeForError(error: EliminationError): number {
  if (error instanceof PlayerAlreadyEliminatedError) return 400;
  if (error instanceof PositionAlreadyTakenError) return 400;
  if (error instanceof InvalidEliminatorError) return 400;
  if (error instanceof GameDateNotInProgressError) return 400;
  if (error instanceof InvalidPositionError) return 400;
  return 500;
}
