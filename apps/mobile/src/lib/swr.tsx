/**
 * SWR con la misma configuración que la web (src/lib/swr-config.tsx),
 * adaptada a React Native:
 *
 * - "focus" en móvil = la app vuelve a primer plano (AppState → active). La web
 *   tiene revalidateOnFocus en false porque allí el foco cambia cada vez que se
 *   toca otra pestaña; en el teléfono volver a la app es justo cuando los datos
 *   pueden estar viejos (p.ej. tras horas con la fecha en vivo), así que aquí sí
 *   se revalida. dedupingInterval (30 s) sigue evitando ráfagas.
 * - No hay eventos online/offline del navegador; la reconexión también se
 *   dispara al volver a primer plano.
 * - El 401 lo resuelve api.ts → AuthContext (cierra sesión y vuelve al login).
 */
import { type ReactNode } from 'react';
import { AppState } from 'react-native';
import { SWRConfig, type SWRConfiguration } from 'swr';

import { ApiError, fetcher } from '@/lib/api';

function onAppActive(callback: () => void): () => void {
  let previous: string | null | undefined = AppState.currentState;
  const sub = AppState.addEventListener('change', (next) => {
    if (previous !== 'active' && next === 'active') callback();
    previous = next;
  });
  return () => sub.remove();
}

const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  revalidateOnMount: true,
  refreshInterval: 0,
  dedupingInterval: 30000,
  errorRetryInterval: 5000,
  errorRetryCount: 3,
  loadingTimeout: 10000,

  provider: () => new Map(),
  isOnline: () => true,
  isVisible: () => AppState.currentState === 'active',
  initFocus: (callback) => onAppActive(callback),
  initReconnect: (callback) => onAppActive(callback),

  onErrorRetry: (error, _key, config, revalidate, { retryCount }) => {
    // 4xx no se arregla reintentando (404, 401, 403, 400...).
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) return;
    if (retryCount >= (config.errorRetryCount ?? 3)) return;
    setTimeout(() => revalidate({ retryCount }), config.errorRetryInterval ?? 5000);
  },
  onError: (error: unknown, key: string) => {
    if (__DEV__) console.warn('SWR Error:', { key, error });
  },
};

export function SWRProvider({ children }: { children: ReactNode }) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}

/** Keys de SWR, iguales a las de la web para que sea fácil portar pantallas. */
export const swrKeys = {
  tournamentRanking: (tournamentId: number) => `/api/tournaments/${tournamentId}/ranking`,
  tournamentInsights: (tournamentId: number) => `/api/tournaments/${tournamentId}/insights`,
  activeTournament: () => '/api/tournaments/active',
  previousTournament: () => '/api/tournaments/previous',
  tournament: (tournamentId: number) => `/api/tournaments/${tournamentId}`,
  /** Podio oficial de cada torneo terminado (Inicio y Stats > Torneos comparten la key). */
  tournamentWinners: () => '/api/tournaments/winners',

  playerDetails: (playerId: string) => `/api/players/${playerId}/public`,
  playerTournamentDetails: (playerId: string, tournamentId: number) =>
    `/api/players/${playerId}/tournament/${tournamentId}`,

  gameDates: (tournamentId: number) => `/api/tournaments/${tournamentId}/dates/public`,
  gameDatesDetailed: (tournamentId: number) => `/api/tournaments/${tournamentId}/dates`,
  activeGameDate: () => '/api/game-dates/active',
  gameDate: (gameDateId: number) => `/api/game-dates/${gameDateId}`,

  gameDateEliminations: (gameDateId: number) => `/api/eliminations/game-date/${gameDateId}`,

  /** El id solo se valida (los jugadores son los activos de siempre): Inicio y Stats comparten esta key. */
  daysWithoutVictory: (tournamentId: number) => `/api/stats/days-without-victory/${tournamentId}`,

  availablePlayers: () => '/api/players?role=Enfermo,Comision&active=true',
  availableGuests: () => '/api/players/available-guests',
} as const;

/** Invalidaciones encadenadas, igual que `mutateRelated` de la web. */
export const mutateRelated = {
  tournamentRanking: (mutate: (key: string) => void, tournamentId: number) => {
    mutate(swrKeys.tournamentRanking(tournamentId));
    mutate(swrKeys.activeTournament());
  },
  gameDate: (mutate: (key: string) => void, tournamentId: number, gameDateId?: number) => {
    mutate(swrKeys.gameDates(tournamentId));
    mutate(swrKeys.gameDatesDetailed(tournamentId));
    mutate(swrKeys.tournamentRanking(tournamentId));
    mutate(swrKeys.activeGameDate());
    if (gameDateId) {
      mutate(swrKeys.gameDate(gameDateId));
      mutate(swrKeys.gameDateEliminations(gameDateId));
    }
  },
  elimination: (mutate: (key: string) => void, tournamentId: number, gameDateId: number) => {
    mutate(swrKeys.gameDateEliminations(gameDateId));
    mutate(swrKeys.gameDate(gameDateId));
    mutate(swrKeys.tournamentRanking(tournamentId));
    mutate(swrKeys.gameDates(tournamentId));
  },
};
