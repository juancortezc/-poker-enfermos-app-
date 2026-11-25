/**
 * Selector de fecha de juego sin dependencias nuevas: las fechas son martes,
 * así que se mueve de semana en semana con dos botones grandes. Sustituye al
 * <input type="date"> de la web, que dejaba elegir cualquier día.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { addDaysToDateString } from '@poker/shared';
import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

import { useCP } from '@/theme/tone';

import { shortDate } from './api';

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  /** Días por toque (7 = una semana). */
  step?: number;
  compact?: boolean;
};

export function DateStepper({ value, onChange, label, disabled = false, step = 7, compact = false }: Props) {
  const move = (dir: 1 | -1) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(addDaysToDateString(value, dir * step));
  };
  const weekday = new Date(`${value}T12:00:00Z`).toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'UTC' });

  return (
    <View className={`flex-row items-center gap-2 ${disabled ? 'opacity-50' : ''}`}>
      <StepButton icon="chevron-back" label={`${label ?? 'Fecha'}: una semana antes`} onPress={() => move(-1)} disabled={disabled} />
      <View className="flex-1 items-center">
        <Text className={`font-display text-cp-on-surface ${compact ? 'text-base' : 'text-lg'}`}>{shortDate(value)}</Text>
        <Text className="font-inter text-xs capitalize text-cp-on-surface-muted">{weekday}</Text>
      </View>
      <StepButton icon="chevron-forward" label={`${label ?? 'Fecha'}: una semana después`} onPress={() => move(1)} disabled={disabled} />
    </View>
  );
}

function StepButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const c = useCP();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full border border-cp-surface-border bg-cp-surface-2 active:opacity-70">
      <Ionicons name={icon} size={20} color={c.onSurface} />
    </Pressable>
  );
}
