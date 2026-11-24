/**
 * Fila de chips desplazable para elegir subpestaña. Equivale a los chips de
 * /stats en la web, en Noir: el activo en oro, los demás en superficie.
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
            className={`min-h-[44px] justify-center rounded-full border px-4 ${
              active ? 'border-noir-gold bg-noir-gold' : 'border-noir-border bg-noir-surface active:opacity-80'
            }`}>
            <Text
              className={`font-cinzel-bold text-xs uppercase tracking-[1.5px] ${
                active ? 'text-noir-bg' : 'text-noir-muted'
              }`}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
