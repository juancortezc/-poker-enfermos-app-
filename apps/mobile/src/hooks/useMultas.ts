/** Multas del torneo (`/api/multas`, pública). Opcionalmente de un jugador. */
import useSWR from 'swr';

export interface Multa {
  id: number;
  reason: string;
  pointsPenalty: number;
  chipsAmount: number | null;
  moneyAmount: number | null;
  paid: boolean;
  player: { id: string; firstName: string; lastName: string; photoUrl?: string | null };
}

export function useMultas(tournamentId: number | null | undefined, playerId?: string) {
  const key = tournamentId
    ? `/api/multas?tournamentId=${tournamentId}${playerId ? `&playerId=${encodeURIComponent(playerId)}` : ''}`
    : null;
  const swr = useSWR<Multa[]>(key);
  return { ...swr, multas: swr.data };
}
