import { NextResponse } from 'next/server';
import {
  RankingError,
  TournamentNotFoundError,
  PlayerNotInRankingError,
  NoCompletedDatesError,
} from '@/domain/ranking';

/**
 * Maps ranking domain errors to HTTP responses.
 */
export function handleRankingError(error: unknown): NextResponse {
  console.error('[Ranking API Error]', error);

  if (error instanceof RankingError) {
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
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { error: 'An unexpected error occurred' },
    { status: 500 }
  );
}

function getStatusCodeForError(error: RankingError): number {
  if (error instanceof TournamentNotFoundError) return 404;
  if (error instanceof PlayerNotInRankingError) return 404;
  if (error instanceof NoCompletedDatesError) return 400;
  return 500;
}
