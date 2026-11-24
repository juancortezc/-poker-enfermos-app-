/**
 * Torneos para los selectores de Premios, P&H y Reportes. Por defecto el
 * activo; si no hay, el más reciente. `minNumber` corta los viejos (los
 * premios existen desde T28).
 */
import { useState } from 'react';
import useSWR from 'swr';

import type { Option } from '@/components/torneo/OptionPicker';
import { swrKeys } from '@/lib/swr';

type TournamentListItem = { id: number; number: number; name: string; status: string };
type ActiveResponse = { tournament: { id: number; number: number } | null };

export function useTournamentOptions(minNumber = 0) {
  const { data: list, error, isLoading } = useSWR<TournamentListItem[]>('/api/tournaments');
  const { data: active } = useSWR<ActiveResponse>(swrKeys.activeTournament());
  const [picked, setPicked] = useState<number | null>(null);

  const tournaments = (list ?? []).filter((t) => t.number >= minNumber).sort((a, b) => b.number - a.number);
  const options: Option<number>[] = tournaments.map((t) => ({
    value: t.id,
    label: `Torneo ${t.number}`,
    hint: t.status === 'ACTIVO' ? 'Activo' : undefined,
  }));

  const activeId = active?.tournament?.id;
  const fallback = tournaments.find((t) => t.id === activeId)?.id ?? tournaments[0]?.id ?? null;
  const selectedId = picked ?? fallback;
  const selected = tournaments.find((t) => t.id === selectedId) ?? null;

  return { options, selectedId, selected, setSelectedId: setPicked, error, isLoading };
}
