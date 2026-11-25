/**
 * Fila de chips desplazable para elegir subpestaña: los chips de /stats en
 * la web. El activo es una píldora roja sólida (#C62828) con texto blanco; los
 * demás, superficie 2 con texto atenuado. Archivo 800.
 */
import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, Text } from 'react-native';

type Tab<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  tabs: readonly Tab<T>[];
  value: T;
  onChange: (id: T) => void;
};

export function ChipTabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-4">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              Haptics.selectionAsync().catch(() => {});
              onChange(tab.id);
            }}
            className={`min-h-[44px] justify-center rounded-full px-4 ${
              active ? 'bg-cp-primary-variant' : 'bg-cp-surface-2 active:opacity-80'
            }`}>
            <Text
              className={`font-display text-xs tracking-[0.5px] ${
                active ? 'text-white' : 'text-cp-on-surface-muted'
              }`}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
