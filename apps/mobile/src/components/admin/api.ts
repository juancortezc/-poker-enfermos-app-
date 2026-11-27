/**
 * Datos de las pantallas de Comisión: tipos de las respuestas de la API y
 * hooks SWR con las mismas rutas que usa la web en /admin, /tournaments,
 * /game-dates y /players. Todo lo que escribe vive en cada pantalla.
 */
import type { BlindLevel, UserRole } from '@poker/shared';
import { Alert } from 'react-native';
import useSWR, { useSWRConfig } from 'swr';

import { ApiError } from '@/lib/api';
import { mutateRelated, swrKeys } from '@/lib/swr';

export type TournamentStatus = 'PROXIMO' | 'ACTIVO' | 'FINALIZADO';
export type GameDateStatus = 'pending' | 'CREATED' | 'in_progress' | 'completed' | 'cancelled';

export interface AdminPlayer {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  photoUrl?: string | null;
  isActive?: boolean;
  aliases?: string[];
  inviter?: { id?: string; firstName: string; lastName: string } | null;
  /** Solo invitados externos de available-guests: día de su última fecha. */
  lastPlayedAt?: string | null;
}

export interface TournamentGameDate {
  id: number;
  dateNumber: number;
  scheduledDate: string;
  status: GameDateStatus;
  /** Jugadores de la fecha (lo trae GET /api/tournaments/[id]). */
  playerIds?: string[];
}

/** GET /api/tournaments?status=… */
export interface TournamentListItem {
  id: number;
  name: string;
  number: number;
  status: TournamentStatus;
  createdAt: string;
  gameDates: TournamentGameDate[];
  _count: { tournamentParticipants: number; gameDates: number };
}

/** GET /api/tournaments/[id] */
export interface TournamentDetail {
  id: number;
  name: string;
  number: number;
  status: TournamentStatus;
  totalDates?: number | null;
  datesToEliminate?: number | null;
  gameDates: TournamentGameDate[];
  tournamentParticipants: { player: AdminPlayer }[];
  blindLevels: BlindLevel[];
}

/** GET /api/game-dates/[id] (solo Comisión). */
export interface GameDateDetail {
  id: number;
  dateNumber: number;
  scheduledDate: string;
  status: GameDateStatus;
  playerIds: string[];
  playersCount: number;
  tournament: { id: number; name: string; number: number };
}

/** GET /api/game-dates/available-dates */
export interface AvailableDatesResponse {
  tournament: { id: number; name: string; number: number; totalDates: number; datesToEliminate: number } | null;
  availableDates: { id: number; dateNumber: number; scheduledDate: string; status: string }[];
  registeredPlayers: AdminPlayer[];
  additionalPlayers: AdminPlayer[];
  missingDate?: number | null;
  blocked?: boolean;
  blockedReason?: string;
  blockedDate?: { id: number; dateNumber: number; status: string } | null;
}

/** GET /api/players/available-guests */
export interface AvailableGuestsResponse {
  groupMembers: AdminPlayer[];
  externalGuests: AdminPlayer[];
}

export const adminKeys = {
  tournaments: (status: TournamentStatus) => `/api/tournaments?status=${status}`,
  nextNumber: () => '/api/tournaments/next-number',
  availableDates: () => '/api/game-dates/available-dates',
  availableGuests: (tournamentId?: number) =>
    tournamentId ? `/api/players/available-guests?tournamentId=${tournamentId}` : '/api/players/available-guests',
  members: () => '/api/players?role=Enfermo,Comision',
  allPlayers: () => '/api/players',
  player: (id: string) => `/api/players/${id}`,
  datePlayers: (gameDateId: number) => `/api/game-dates/${gameDateId}/players`,
} as const;

export function useTournaments(status: TournamentStatus) {
  return useSWR<TournamentListItem[]>(adminKeys.tournaments(status));
}

export function useTournament(id: number | null) {
  return useSWR<TournamentDetail>(id ? swrKeys.tournament(id) : null);
}

export function useNextTournamentNumber() {
  return useSWR<{ nextNumber: number }>(adminKeys.nextNumber());
}

export function useGameDate(id: number | null) {
  return useSWR<{ gameDate: GameDateDetail }>(id ? swrKeys.gameDate(id) : null);
}

export function useAvailableDates() {
  return useSWR<AvailableDatesResponse>(adminKeys.availableDates());
}

/** Enfermos y Comisión activos: candidatos a participar de un torneo. */
export function useMembers() {
  const swr = useSWR<AdminPlayer[]>(adminKeys.members());
  return { ...swr, members: swr.data?.filter((p) => p.isActive !== false) };
}

/** Invalida todo lo que cambia al tocar torneos o fechas. */
export function useAdminRefresh() {
  const { mutate } = useSWRConfig();
  return {
    tournaments: (tournamentId?: number) => {
      mutate((key) => typeof key === 'string' && key.startsWith('/api/tournaments'));
      mutate(adminKeys.availableDates());
      mutate(swrKeys.activeGameDate());
      if (tournamentId) mutateRelated.tournamentRanking(mutate, tournamentId);
    },
    gameDate: (tournamentId: number, gameDateId?: number) => {
      mutateRelated.gameDate(mutate, tournamentId, gameDateId);
      mutate(adminKeys.availableDates());
      mutate(swrKeys.activeTournament());
      if (gameDateId) mutate(adminKeys.datePlayers(gameDateId));
    },
    players: () => {
      mutate((key) => typeof key === 'string' && key.startsWith('/api/players'));
    },
  };
}

/** Mensaje de error de la API (viene en español) o uno genérico. */
export function errorMessage(error: unknown, fallback = 'Algo salió mal'): string {
  if (error instanceof ApiError) {
    if (error.status >= 500 && error.message.startsWith('HTTP')) return 'El servidor tuvo un problema. Probá en un rato.';
    return error.message;
  }
  if (error instanceof Error && /network|fetch/i.test(error.message)) return 'Sin conexión. Revisá tu internet.';
  return error instanceof Error ? error.message : fallback;
}

/** Alert nativo de confirmación como promesa: true si se acepta. */
export function confirmAction(
  title: string,
  message: string,
  confirmText = 'Confirmar',
  destructive = true
): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

/** "martes 1 de diciembre de 2026" a partir de "YYYY-MM-DD" o ISO (día UTC). */
export function longDate(value: string): string {
  const d = new Date(`${value.split('T')[0]}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** "1 dic 2026" (día UTC). */
export function shortDate(value: string): string {
  const d = new Date(`${value.split('T')[0]}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export const statusLabel: Record<GameDateStatus, string> = {
  pending: 'Pendiente',
  CREATED: 'Configurada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};
