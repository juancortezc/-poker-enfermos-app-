/**
 * Timer compacto para el registro (la fila "Blinds · Tiempo · controles" de
 * /registro en la web). La Comisión tiene el registro abierto toda la noche:
 * si no hay una pantalla proyectada, este es el teléfono que avisa.
 */
import { Text, View } from 'react-native';

import { CPCard } from '@/components/ui/CPCard';
import { Muted } from '@/components/ui/Typography';
import { useCP } from '@/theme/tone';

import { TimerControls } from './TimerControls';
import { formatChips, formatRemaining, isDinnerBreak, type TimerDisplay } from './timer-view';
import type { TimerAction } from './types';
import type { TimerFlash } from './useTimerAlerts';

export function TimerStrip({
  view,
  flash,
  canControl,
  onAction,
}: {
  view: TimerDisplay | null;
  flash: TimerFlash | null;
  canControl: boolean;
  onAction: (a: TimerAction) => Promise<void>;
}) {
  const c = useCP();
  const paused = view?.status === 'paused';
  const critical = view?.status === 'active' && !view.isUnlimited && view.remainingMs <= 60_000 && view.remainingMs > 0;
  const time = view?.isUnlimited ? 'SIN LÍMITE' : formatRemaining(view?.remainingMs ?? 0);

  return (
    <View className="gap-2">
      {flash ? (
        <View
          className="rounded-cp px-4 py-3"
          style={{
            // Los fondos de destello del timer web: cambio de nivel rojo, aviso ambar.
            backgroundColor: flash.kind === 'level-change' ? '#7F1D1D' : '#4A3708',
          }}>
          <Text
            accessibilityLiveRegion="assertive"
            className="text-center font-inter-bold text-lg tracking-wide text-white">
            {flash.message}
          </Text>
        </View>
      ) : null}
      <CPCard className="gap-3 p-3">
        <View className="flex-row items-center justify-around gap-2">
          <View className="items-center">
            <Muted className="text-xs">Nivel {view?.level ?? '—'}</Muted>
            <Text className="font-display text-lg text-cp-on-surface" style={{ fontVariant: ['tabular-nums'] }}>
              {formatChips(view?.smallBlind)}/{formatChips(view?.bigBlind)}
            </Text>
          </View>
          <View
            className={`items-center rounded-cp px-3 py-1 ${paused ? 'bg-cp-warning/15' : 'bg-cp-primary/15'}`}>
            <Muted className="text-xs">{view && isDinnerBreak(view) ? 'Cena' : paused ? 'Pausado' : 'Tiempo'}</Muted>
            <Text
              className="font-display text-2xl"
              style={{
                color: paused ? c.warning : critical ? c.primaryLight : c.onSurface,
                fontVariant: ['tabular-nums'],
              }}>
              {time}
            </Text>
          </View>
        </View>
        <TimerControls view={view} canControl={canControl} onAction={onAction} compact />
      </CPCard>
    </View>
  );
}
