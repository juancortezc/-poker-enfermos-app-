/**
 * El timer visto desde el teléfono. Equivale a hooks/useBlindTimer.ts de la
 * web, con el cálculo hecho por timer-engine de @poker/shared:
 *
 * - El servidor manda una foto (nivel, cuánto falta, su hora). Con los
 *   niveles del torneo se reconstruye el ancla y resolveTimer() deriva todo.
 *   No hay contador local: el tic de un segundo solo vuelve a calcular.
 * - Al volver a primer plano se recalcula al instante y se pide el estado al
 *   servidor (puede haber pausado otro dispositivo mientras tanto).
 * - Se corrige el desfase de reloj del teléfono con `serverNow`.
 */
import { toBlindSpecs, type BlindSpec } from '@poker/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import useSWR from 'swr';

import { apiFetch } from '@/lib/api';
import { swrKeys } from '@/lib/swr';

import { computeTimerView, type TimerDisplay, type TimerEntry } from './timer-view';
import type { TimerAction, TimerSnapshot } from './types';

type TournamentBlinds = {
  blindLevels?: {
    level: number;
    smallBlind: number;
    bigBlind: number;
    duration: number;
  }[];
};

export const timerKey = (gameDateId: number) => `/api/timer/${gameDateId}`;

/**
 * Key propia (no la ruta sola): aquí la cache guarda { snapshot, receivedAt }
 * y otra pantalla que pida /api/timer/[id] con el fetcher normal guardaría
 * otra forma bajo la misma key.
 */
type TimerKey = readonly [path: string, tag: 'envivo-entry'];

async function fetchTimer([path]: TimerKey): Promise<TimerEntry> {
  const snapshot = await apiFetch<TimerSnapshot>(path);
  return { snapshot, receivedAt: Date.now() };
}

export function useBlindTimer(gameDateId: number | null, tournamentId: number | null) {
  const { data, error, isLoading, mutate } = useSWR<TimerEntry, unknown, TimerKey | null>(
    gameDateId ? [timerKey(gameDateId), 'envivo-entry'] : null,
    fetchTimer,
    {
      // Respaldo para cambios hechos desde otro dispositivo. La cuenta
      // regresiva no depende de esto.
      refreshInterval: 15_000,
      dedupingInterval: 2_000,
    }
  );

  // Los niveles casi nunca cambian: se piden una vez por sesión de pantalla.
  const { data: tournament } = useSWR<TournamentBlinds>(tournamentId ? swrKeys.tournament(tournamentId) : null, {
    revalidateOnFocus: false,
    dedupingInterval: 10 * 60_000,
  });

  const levels: BlindSpec[] = useMemo(
    () => (tournament?.blindLevels?.length ? toBlindSpecs(tournament.blindLevels) : []),
    [tournament]
  );

  const [now, setNow] = useState(() => Date.now());
  const running = data?.snapshot.status === 'active';

  // Tic de un segundo, solo para refrescar lo que se ve.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Primer plano: recalcular ya y confirmar con el servidor.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setNow(Date.now());
      if (gameDateId) mutate();
    });
    return () => sub.remove();
  }, [gameDateId, mutate]);

  // Una respuesta recién llegada es más nueva que el último tic.
  const view: TimerDisplay | null = useMemo(
    () => (data ? computeTimerView(data, levels, Math.max(now, data.receivedAt)) : null),
    [data, levels, now]
  );

  // Si el motor cambió de nivel por su cuenta (o se acabó la estructura), se
  // confirma con el servidor: él es quien manda.
  const derivedLevel = view?.level;
  const snapshotLevel = data?.snapshot.level;
  useEffect(() => {
    if (derivedLevel == null || snapshotLevel == null || derivedLevel === snapshotLevel) return;
    mutate();
  }, [derivedLevel, snapshotLevel, mutate]);

  const control = useCallback(
    async (action: TimerAction) => {
      if (!gameDateId) return;
      const snapshot = await apiFetch<TimerSnapshot>(timerKey(gameDateId), {
        method: 'POST',
        json: { action },
      });
      // La respuesta ya trae el estado resultante.
      await mutate({ snapshot, receivedAt: Date.now() }, { revalidate: false });
    },
    [gameDateId, mutate]
  );

  return { view, levels, error, isLoading, control, refresh: mutate };
}
