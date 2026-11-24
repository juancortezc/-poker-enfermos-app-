/**
 * Datos secundarios de la home y del perfil de jugador: cumpleaños y sequías,
 * días sin ganar, campeonatos históricos y el podcast.
 */
import useSWR from 'swr';

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

export interface DaysWithoutVictoryResponse {
  players: {
    id: string;
    firstName: string;
    lastName: string;
    daysWithoutVictory: number;
    hasNeverWon: boolean;
  }[];
}

export function useDaysWithoutVictory(tournamentId: number | null | undefined) {
  return useSWR<DaysWithoutVictoryResponse>(tournamentId ? `/api/stats/days-without-victory/${tournamentId}` : null);
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
