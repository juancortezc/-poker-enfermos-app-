/**
 * Datos de la fecha en vivo para el registro: jugadores, eliminaciones y
 * ranking proyectado. Mismo sondeo que la web (/registro refresca cada 5 s).
 */
import useSWR, { useSWRConfig } from 'swr';

import { ApiError } from '@/lib/api';
import { mutateRelated, swrKeys } from '@/lib/swr';

import type { DatePlayer, Elimination, LiveRankingData } from './types';

export const datePlayersKey = (gameDateId: number) => `/api/game-dates/${gameDateId}/players`;
export const liveRankingKey = (gameDateId: number) => `/api/game-dates/${gameDateId}/live-ranking`;

const LIVE = { refreshInterval: 5_000, dedupingInterval: 2_000 };

export function useLiveDate(gameDateId: number | null, inProgress: boolean) {
  const players = useSWR<DatePlayer[]>(gameDateId ? datePlayersKey(gameDateId) : null, LIVE);
  const eliminations = useSWR<Elimination[]>(gameDateId ? swrKeys.gameDateEliminations(gameDateId) : null, LIVE);
  // 409 si la fecha no está en curso: solo se pide con in_progress.
  const ranking = useSWR<LiveRankingData>(gameDateId && inProgress ? liveRankingKey(gameDateId) : null, {
    refreshInterval: 10_000,
    dedupingInterval: 3_000,
  });
  return { players, eliminations, ranking };
}

/** Lo que hay que refrescar después de escribir (igual que la web). */
export function useRefreshLive() {
  const { mutate } = useSWRConfig();
  return (tournamentId: number, gameDateId: number) => {
    mutateRelated.elimination(mutate, tournamentId, gameDateId);
    mutate(swrKeys.activeGameDate());
    mutate(swrKeys.activeTournament());
    mutate(swrKeys.gameDatesDetailed(tournamentId));
    mutate(datePlayersKey(gameDateId));
    mutate(liveRankingKey(gameDateId));
  };
}

/**
 * La API de eliminaciones responde en inglés con un `code`. En la mesa se
 * lee en español.
 */
export function eliminationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    let code: string | undefined;
    try {
      code = (JSON.parse(error.info) as { code?: string }).code;
    } catch {
      code = undefined;
    }
    switch (code) {
      case 'PLAYER_ALREADY_ELIMINATED':
        return 'Ese jugador ya está eliminado en esta fecha.';
      case 'POSITION_ALREADY_TAKEN':
        return 'Esa posición ya está registrada. Alguien la cargó desde otro teléfono: revisá la lista.';
      case 'INVALID_ELIMINATOR':
        return 'El eliminador ya estaba eliminado antes de esta posición.';
      case 'GAME_DATE_NOT_IN_PROGRESS':
        return 'La fecha no está en curso.';
      case 'INVALID_POSITION':
        return 'Posición inválida para la cantidad de jugadores.';
      case 'POSITION_NOT_NEXT':
        return 'Esa no es la siguiente posición. Alguien registró otra desde otro teléfono: revisá la lista.';
      case 'ELIMINATION_CONFLICT':
        return 'Otro teléfono registró esa eliminación al mismo tiempo. Revisá la lista.';
      case 'SELF_ELIMINATION':
        return 'El eliminador no puede ser el mismo jugador eliminado.';
      case 'PLAYER_NOT_IN_GAME_DATE':
        return 'Ese jugador no está en esta fecha.';
      case 'NOT_LAST_ELIMINATION':
        return 'Solo se puede deshacer la última eliminación.';
    }
    if (error.status === 403) return 'Solo la Comisión puede registrar eliminaciones.';
    if (/later eliminations|occurred after/i.test(error.message)) {
      return 'Solo se puede deshacer la última eliminación.';
    }
    if (error.status >= 500) return 'El servidor tuvo un problema. Probá de nuevo.';
    return error.message;
  }
  if (error instanceof Error && /network|fetch/i.test(error.message)) return 'Sin conexión. Revisá tu internet.';
  return 'Algo salió mal.';
}
