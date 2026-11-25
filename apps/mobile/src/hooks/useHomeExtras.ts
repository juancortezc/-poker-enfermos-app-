/**
 * Datos secundarios de la home y del perfil de jugador: cumpleaños y sequías,
 * días sin ganar, campeonatos históricos y el podcast.
 */
import useSWR from 'swr';

import { swrKeys } from '@/lib/swr';

export interface CelebrationPlayer {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}

export interface CelebrationsData {
  birthdays: (CelebrationPlayer & { isToday: boolean; daysUntil: number })[];
  droughts: (CelebrationPlayer & { daysSinceVictory: number })[];
}

export function useCelebrations() {
  return useSWR<CelebrationsData>('/api/players/celebrations', { refreshInterval: 3600000 });
}

interface ChampionStatsResponse {
  success: boolean;
  data?: { all: { player: { id: string } | null; championshipsCount: number }[] };
}

/** Cuántos torneos ganó el jugador (0 si ninguno). */
export function useChampionships(playerId: string | undefined) {
  const swr = useSWR<ChampionStatsResponse>('/api/tournaments/champions-stats');
  const count = swr.data?.data?.all?.find((c) => c.player?.id === playerId)?.championshipsCount ?? 0;
  return { ...swr, count };
}

export interface PodcastInfo {
  showId: string;
  title: string;
  thumbnailUrl: string;
  spotifyUrl: string;
  provider: string;
}

export function usePodcast() {
  return useSWR<PodcastInfo>('/api/podcast');
}

export interface WinnerPlayer {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  isActive: boolean;
  aliases: string[];
}

/** Una fila de GET /api/tournaments/winners (envuelto en `{ success, data, total }`). */
export interface TournamentWinner {
  id: number;
  tournamentNumber: number;
  champion: WinnerPlayer;
  runnerUp: WinnerPlayer;
  thirdPlace: WinnerPlayer;
  siete: WinnerPlayer | null;
  dos: WinnerPlayer | null;
}

/** Podio oficial de un torneo terminado; `null` mientras la Comisión no lo cargó. Sin número no pide nada. */
export function useTournamentWinner(tournamentNumber: number | null | undefined) {
  const swr = useSWR<{ success: boolean; data?: TournamentWinner[] }>(
    tournamentNumber ? swrKeys.tournamentWinners() : null,
    { revalidateOnFocus: false }
  );
  const winner = swr.data?.data?.find((w) => w.tournamentNumber === tournamentNumber) ?? null;
  return { winner, isLoading: swr.isLoading, error: swr.error, mutate: swr.mutate };
}
