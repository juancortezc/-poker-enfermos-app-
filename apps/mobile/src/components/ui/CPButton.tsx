/**
 * Boton Clean Poker:
 * - primary: rojo del club #E53935 con texto blanco (la accion de la pantalla)
 * - outline: borde neutro, texto on-surface
 * - ghost: solo texto
 * Radio de 5 px (`--cp-radius-md`), como los botones de la web.
 */
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, Text, View, type PressableProps } from 'react-native';

import { useCP } from '@/theme/tone';

export type CPButtonVariant = 'primary' | 'outline' | 'ghost';
export type CPButtonSize = 'md' | 'lg';

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: CPButtonVariant;
  size?: CPButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
};

const containerByVariant: Record<CPButtonVariant, string> = {
  primary: 'bg-cp-primary border border-cp-primary',
  outline: 'bg-transparent border border-cp-outline',
  ghost: 'bg-transparent border border-transparent',
};

const textByVariant: Record<CPButtonVariant, string> = {
  primary: 'text-cp-on-primary',
  outline: 'text-cp-on-surface',
  ghost: 'text-cp-on-surface-muted',
};

export function CPButton({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  onPress,
  className = '',
  ...rest
}: Props) {
  const c = useCP();
  const isDisabled = disabled || loading;
  const sizing = size === 'lg' ? 'min-h-[56px] px-6' : 'min-h-[48px] px-5';
  const textSize = size === 'lg' ? 'text-base' : 'text-[15px]';
  const spinnerColor = variant === 'primary' ? c.onPrimary : c.onSurface;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      className={`flex-row items-center justify-center rounded-cp ${sizing} ${containerByVariant[variant]} ${
        isDisabled ? 'opacity-50' : 'active:opacity-80'
      } ${className}`}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={`font-inter-bold uppercase tracking-[0.5px] ${textSize} ${textByVariant[variant]}`}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}
