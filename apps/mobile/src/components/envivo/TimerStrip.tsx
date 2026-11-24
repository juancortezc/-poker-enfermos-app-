/**
 * Timer compacto para el registro (la fila "Blinds · Tiempo · controles" de
 * /registro en la web). La Comisión tiene el registro abierto toda la noche:
 * si no hay una pantalla proyectada, este es el teléfono que avisa.
 */
import { Text, View } from 'react-native';

import { NoirCard } from '@/components/ui/NoirCard';
import { Muted } from '@/components/ui/Typography';
import { noir } from '@/theme/colors';

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
  const paused = view?.status === 'paused';
  const critical = view?.status === 'active' && !view.isUnlimited && view.remainingMs <= 60_000 && view.remainingMs > 0;
  const time = view?.isUnlimited ? 'SIN LÍMITE' : formatRemaining(view?.remainingMs ?? 0);

  return (
    <View className="gap-2">
      {flash ? (
        <View
          className="rounded-2xl px-4 py-3"
          style={{
            backgroundColor: flash.kind === 'level-change' ? noir.copper : '#8A6A1F',
          }}>
          <Text
            accessibilityLiveRegion="assertive"
            className="text-center font-inter-bold text-lg tracking-wide text-white">
            {flash.message}
          </Text>
        </View>
      ) : null}
      <NoirCard className="gap-3 p-3">
        <View className="flex-row items-center justify-around gap-2">
          <View className="items-center">
            <Muted className="text-xs">Nivel {view?.level ?? '—'}</Muted>
            <Text className="font-inter-bold text-lg text-noir-text">
              {formatChips(view?.smallBlind)}/{formatChips(view?.bigBlind)}
            </Text>
          </View>
          <View
            className="items-center rounded-xl px-3 py-1"
            style={{
              backgroundColor: paused ? 'rgba(224,182,108,0.15)' : 'rgba(169,68,28,0.18)',
            }}>
            <Muted className="text-xs">{view && isDinnerBreak(view) ? 'Cena' : paused ? 'Pausado' : 'Tiempo'}</Muted>
            <Text
              className="font-inter-bold text-2xl"
              style={{
                color: paused ? noir.gold : critical ? noir.danger : noir.text,
                fontVariant: ['tabular-nums'],
              }}>
              {time}
            </Text>
          </View>
        </View>
        <TimerControls view={view} canControl={canControl} onAction={onAction} compact />
      </NoirCard>
    </View>
  );
}
