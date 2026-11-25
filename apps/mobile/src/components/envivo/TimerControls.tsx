/**
 * Controles del timer. Solo Comisión: los demás ven el candado, igual que el
 * indicador de función restringida de la web.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Muted } from '@/components/ui/Typography';
import { useCP } from '@/theme/tone';

import { formatChips, type TimerDisplay } from './timer-view';
import type { TimerAction } from './types';

type Props = {
  view: TimerDisplay | null;
  canControl: boolean;
  onAction: (action: TimerAction) => Promise<void>;
  /** Botones grandes (pantalla timer) o compactos (registro). */
  compact?: boolean;
};

export function TimerLockNotice() {
  const c = useCP();
  return (
    <View
      className="flex-row items-center justify-center gap-2 rounded-full border border-cp-surface-border px-4 py-2"
      accessibilityLabel="Solo la Comisión controla el timer">
      <Ionicons name="lock-closed" size={14} color={c.onSurfaceVariant} />
      <Muted>Solo la Comisión controla el timer</Muted>
    </View>
  );
}

export function TimerControls({ view, canControl, onAction, compact = false }: Props) {
  const [busy, setBusy] = useState<TimerAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canControl) return compact ? null : <TimerLockNotice />;
  if (!view) return null;

  const run = async (action: TimerAction) => {
    if (busy) return;
    setBusy(action);
    setError(null);
    try {
      await onAction(action);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo controlar el timer');
    } finally {
      setBusy(null);
    }
  };

  // Las acciones que saltan tiempo piden confirmación: en la mesa un toque
  // accidental adelanta los blinds de todos.
  const confirm = (title: string, message: string, action: TimerAction) =>
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí', style: 'destructive', onPress: () => run(action) },
    ]);

  const paused = view.status === 'paused';
  const inactive = view.status === 'inactive';
  const size = compact ? 'sm' : 'lg';

  return (
    <View className="items-center gap-2">
      <View className={`flex-row flex-wrap items-center justify-center ${compact ? 'gap-2' : 'gap-3'}`}>
        {inactive ? (
          <ControlButton
            size={size}
            icon="play"
            label="Iniciar"
            primary
            loading={busy === 'start'}
            onPress={() => run('start')}
          />
        ) : (
          <>
            <ControlButton
              size={size}
              icon={paused ? 'play' : 'pause'}
              label={paused ? 'Reanudar' : 'Pausar'}
              primary
              disabled={view.status === 'completed'}
              loading={busy === 'pause' || busy === 'resume'}
              onPress={() => run(paused ? 'resume' : 'pause')}
            />
            <ControlButton
              size={size}
              icon="refresh"
              label="Reiniciar nivel"
              loading={busy === 'restart-level'}
              onPress={() =>
                confirm(
                  'Reiniciar nivel',
                  `El nivel ${view.level} vuelve a empezar con su tiempo completo.`,
                  'restart-level'
                )
              }
            />
            {view.nextLevel != null ? (
              <ControlButton
                size={size}
                icon="play-forward"
                label="Adelantar"
                loading={busy === 'advance'}
                onPress={() =>
                  confirm(
                    'Adelantar nivel',
                    `Pasar al nivel ${view.nextLevel}: ${formatChips(view.nextSmallBlind)}/${formatChips(view.nextBigBlind)}.`,
                    'advance'
                  )
                }
              />
            ) : null}
          </>
        )}
      </View>
      {error ? <Text className="text-center font-inter text-sm text-cp-primary-light">{error}</Text> : null}
    </View>
  );
}

function ControlButton({
  icon,
  label,
  onPress,
  primary = false,
  disabled = false,
  loading = false,
  size,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  size: 'sm' | 'lg';
}) {
  const c = useCP();
  const isDisabled = disabled || loading;
  // Como el `Boton` del timer web: destacado rojo, el resto translucido.
  const base = primary ? 'bg-cp-primary border-cp-primary' : 'bg-white/10 border-white/20';
  const color = primary ? c.onPrimary : c.onSurface;

  if (size === 'sm') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPress={onPress}
        hitSlop={4}
        className={`h-11 w-11 items-center justify-center rounded-full border ${base} ${isDisabled ? 'opacity-50' : 'active:opacity-80'}`}>
        <Ionicons name={icon} size={18} color={color} />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      className={`min-h-[52px] flex-row items-center gap-2 rounded-[14px] border px-5 ${base} ${
        isDisabled ? 'opacity-50' : 'active:opacity-80'
      }`}>
      <Ionicons name={icon} size={20} color={color} />
      <Text className={`font-inter-semibold text-base ${primary ? 'text-cp-on-primary' : 'text-cp-on-surface'}`}>
        {loading ? '…' : label}
      </Text>
    </Pressable>
  );
}
