/**
 * Selector de pestañas en píldora (Resumen/Fechas/…, Posiciones/Eliminaciones,
 * Última Fecha/Torneo). Cada opción mide al menos 44 pt de alto.
 */
import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

type Option<T extends string> = { id: T; label: string; disabled?: boolean };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function Segmented<T extends string>({ options, value, onChange, className = '' }: Props<T>) {
  return (
    <View
      accessibilityRole="tablist"
      className={`flex-row gap-1 rounded-full border border-noir-border bg-noir-surface p-1 ${className}`}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active, disabled: !!o.disabled }}
            disabled={o.disabled}
            onPress={() => {
              if (active) return;
              Haptics.selectionAsync().catch(() => {});
              onChange(o.id);
            }}
            className={`min-h-[44px] flex-1 items-center justify-center rounded-full px-2 ${
              active ? 'bg-noir-gold' : ''
            } ${o.disabled ? 'opacity-40' : 'active:opacity-70'}`}>
            <Text
              numberOfLines={1}
              className={`font-inter-semibold text-sm ${active ? 'text-noir-bg' : 'text-noir-muted'}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
