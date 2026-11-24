/**
 * Fechas del torneo con sus eliminaciones embebidas
 * (`/api/tournaments/[id]/dates`, exige sesión). Es la misma URL que usan en
 * la web el calendario, la página de fecha y el perfil de jugador, así que
 * SWR la comparte entre pantallas.
 */
import useSWR from 'swr';

import { swrKeys } from '@/lib/swr';

export interface EliminationPlayer {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  role?: string;
}

export interface EliminationDTO {
  id: number;
  gameDateId?: number;
  position: number;
  points: number;
  eliminatedPlayer: EliminationPlayer;
  eliminatorPlayer: EliminationPlayer | null;
  eliminationTime?: string;
}

export interface TournamentDate {
  id: number;
  dateNumber: number;
  scheduledDate: string;
  status: string;
  playerIds: string[];
  eliminations: EliminationDTO[];
}

export function useTournamentDates(tournamentId: number | null | undefined) {
  const swr = useSWR<TournamentDate[]>(tournamentId ? swrKeys.gameDatesDetailed(tournamentId) : null);
  const dates = swr.data ? [...swr.data].sort((a, b) => a.dateNumber - b.dateNumber) : undefined;
  return { ...swr, dates };
}

/** Eliminaciones de una fecha (`/api/eliminations/game-date/[id]`). */
export function useGameDateEliminations(gameDateId: number | null | undefined) {
  return useSWR<EliminationDTO[]>(gameDateId ? swrKeys.gameDateEliminations(gameDateId) : null);
}
