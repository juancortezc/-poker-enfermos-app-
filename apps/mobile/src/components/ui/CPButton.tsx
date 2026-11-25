/**
 * Botón Noir Jazz. Equivale a NoirButton de la web:
 * - primary: dorado sólido con texto oscuro (gradiente oro en la web)
 * - copper: acento cobre para acciones destacadas/destructivas
 * - outline: borde oro, fondo transparente
 * - ghost: solo texto
 */
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, Text, View, type PressableProps } from 'react-native';

import { noir } from '@/theme/colors';

export type NoirButtonVariant = 'primary' | 'copper' | 'outline' | 'ghost';
export type NoirButtonSize = 'md' | 'lg';

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: NoirButtonVariant;
  size?: NoirButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
};

const containerByVariant: Record<NoirButtonVariant, string> = {
  primary: 'bg-noir-gold border border-noir-gold',
  copper: 'bg-noir-copper border border-noir-copper',
  outline: 'bg-transparent border border-noir-gold/70',
  ghost: 'bg-transparent border border-transparent',
};

const textByVariant: Record<NoirButtonVariant, string> = {
  primary: 'text-noir-bg',
  copper: 'text-noir-text',
  outline: 'text-noir-gold',
  ghost: 'text-noir-muted',
};

export function NoirButton({
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
  const isDisabled = disabled || loading;
  const sizing = size === 'lg' ? 'min-h-[60px] px-6' : 'min-h-[48px] px-5';
  const textSize = size === 'lg' ? 'text-lg' : 'text-base';
  const spinnerColor = variant === 'primary' ? noir.bg : noir.gold;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      className={`flex-row items-center justify-center rounded-full ${sizing} ${containerByVariant[variant]} ${
        isDisabled ? 'opacity-50' : 'active:opacity-80'
      } ${className}`}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={`font-cinzel-bold uppercase tracking-[2px] ${textSize} ${textByVariant[variant]}`}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
