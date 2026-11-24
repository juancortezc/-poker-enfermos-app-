/**
 * Avisos del timer mientras la pantalla está montada:
 *
 * 1. Programa las notificaciones locales de los próximos cambios de nivel y
 *    las reprograma cuando cambia el estado (pausa, reanudar, adelantar). Al
 *    desmontar la pantalla las cancela.
 * 2. Con la app abierta, detecta los mismos momentos que la web
 *    (useBlindTimer: 1 minuto antes y al cambiar de nivel) para el destello
 *    y la háptica. Si el cambio fue manual y no había notificación
 *    programada, hace sonar una en el acto.
 */
import { useEffect, useRef, useState } from 'react';

import {
  cancelTimerAlerts,
  retainTimerAlerts,
  hapticFor,
  hasExactAlarms,
  prepareTimerAlerts,
  presentNow,
  scheduleTimerAlerts,
  wasScheduledAround,
  type AlertKind,
  type AlertPermission,
} from './timer-alerts';
import { formatChips, upcomingBoundaries, type TimerDisplay } from './timer-view';
import type { BlindSpec } from '@poker/shared';

export interface TimerFlash {
  kind: AlertKind;
  message: string;
  /** Para que dos avisos iguales seguidos se vean como dos. */
  id: number;
}

const ONE_MINUTE_MS = 60_000;

/**
 * Un cambio de nivel visto con más de esto transcurrido no es de ahora: pasó
 * con la app en segundo plano y su notificación ya sonó. No se repite.
 */
const STALE_CHANGE_MS = 10_000;

export function useTimerAlerts(view: TimerDisplay | null, levels: BlindSpec[], dateNumber: number | null) {
  const [permission, setPermission] = useState<AlertPermission | null>(null);
  const [exactAlarms, setExactAlarms] = useState(true);
  const [flash, setFlash] = useState<TimerFlash | null>(null);

  const alertedMinuteRef = useRef<string | null>(null);
  const previousLevelRef = useRef<number | null>(null);
  const flashIdRef = useRef(0);

  // Destello en pantalla + háptica.
  function fire(kind: AlertKind, message: string) {
    flashIdRef.current += 1;
    setFlash({ kind, message, id: flashIdRef.current });
    hapticFor(kind);
  }

  useEffect(() => {
    let cancelled = false;
    const release = retainTimerAlerts();
    (async () => {
      const result = await prepareTimerAlerts();
      const exact = await hasExactAlarms();
      if (cancelled) return;
      setPermission(result);
      setExactAlarms(exact);
    })();
    return () => {
      cancelled = true;
      release();
    };
  }, []);

  const status = view?.status;
  const endsAt = view?.levelEndsAtLocal ?? null;
  const endsAtSecond = endsAt == null ? null : Math.round(endsAt / 1000);
  const level = view?.level;

  // Aviso de "falta 1 minuto", una vez por nivel.
  const remaining = view?.remainingMs ?? 0;
  const unlimited = view?.isUnlimited ?? false;
  useEffect(() => {
    if (status !== 'active' || unlimited || level == null) return;
    if (remaining > ONE_MINUTE_MS || remaining <= 0) return;
    const key = `1min:${level}`;
    if (alertedMinuteRef.current === key) return;
    alertedMinuteRef.current = key;

    fire('one-minute', 'FALTA 1 MINUTO');
    const nextLevel = view?.nextLevel;
    if (nextLevel != null && !wasScheduledAround('one-minute', level, Date.now()) && permission === 'granted') {
      presentNow(
        'one-minute',
        {
          level: nextLevel,
          smallBlind: view?.nextSmallBlind ?? 0,
          bigBlind: view?.nextBigBlind ?? 0,
        },
        dateNumber
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, status, level, unlimited]);

  // Aviso de cambio de nivel: al ver un nivel distinto al anterior, también si
  // el cambio fue manual.
  useEffect(() => {
    if (!view || view.status === 'inactive') return;
    const previous = previousLevelRef.current;
    previousLevelRef.current = view.level;
    if (previous === null || previous === view.level) return;
    if (view.elapsedInLevelMs > STALE_CHANGE_MS) return;

    const message = `CAMBIO A ${formatChips(view.smallBlind)}/${formatChips(view.bigBlind)}`;
    fire('level-change', message);
    if (permission === 'granted' && !wasScheduledAround('level-change', view.level, Date.now())) {
      presentNow(
        'level-change',
        {
          level: view.level,
          smallBlind: view.smallBlind ?? 0,
          bigBlind: view.bigBlind ?? 0,
        },
        dateNumber
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // (Re)programar. Va DESPUÉS de la detección: esta mira el plan anterior
  // para saber si el cambio que acaba de ver ya tenía notificación.
  // upcomingBoundaries devuelve [] si no corre → cancela.
  useEffect(() => {
    if (permission !== 'granted' || !view) return;
    const plan = upcomingBoundaries(view, levels);
    if (plan.length === 0) cancelTimerAlerts();
    else scheduleTimerAlerts(plan, dateNumber);
    // `view` cambia cada segundo; lo que importa es estado, nivel y hora de cambio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission, status, level, endsAtSecond, levels, dateNumber]);

  // El destello se apaga solo (igual que la web: 4 s el aviso, 6 s el cambio).
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), flash.kind === 'level-change' ? 6000 : 4000);
    return () => clearTimeout(id);
  }, [flash]);

  return { flash, permission, exactAlarms, setExactAlarms };
}
