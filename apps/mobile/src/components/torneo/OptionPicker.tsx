/**
 * Selector desplegable: un botón con el valor actual que abre una hoja con
 * las opciones. Sustituye a los <select> de la web (torneo, campeón, jugador).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Overline } from '@/components/ui/Typography';
import { noir } from '@/theme/colors';

export type Option<T extends string | number> = { value: T; label: string; hint?: string };

type Props<T extends string | number> = {
  label: string;
  value: T | null;
  options: Option<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  /** Ocupa el ancho disponible (por defecto) o se ajusta al texto. */
  grow?: boolean;
};

export function OptionPicker<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Elegir',
  grow = true,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? placeholder}`}
        onPress={() => setOpen(true)}
        className={`min-h-[44px] flex-row items-center gap-2 rounded-xl border border-noir-border bg-noir-surface px-3 active:opacity-80 ${
          grow ? 'flex-1' : ''
        }`}>
        <Text numberOfLines={1} className={`flex-1 font-inter-semibold text-sm ${current ? 'text-noir-text' : 'text-noir-muted'}`}>
          {current?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={noir.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setOpen(false)} accessibilityLabel="Cerrar">
          <Pressable onPress={() => {}} className="max-h-[70%] rounded-t-3xl border-t border-noir-border bg-noir-bg">
            <SafeAreaView edges={['bottom']}>
              <View className="flex-row items-center justify-between px-5 pb-2 pt-4">
                <Overline>{label}</Overline>
                <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setOpen(false)} className="h-11 w-11 items-center justify-center">
                  <Ionicons name="close" size={22} color={noir.muted} />
                </Pressable>
              </View>
              <FlatList
                data={options}
                keyExtractor={(o) => String(o.value)}
                renderItem={({ item }) => {
                  const selected = item.value === value;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setOpen(false);
                        onChange(item.value);
                      }}
                      className="min-h-[48px] flex-row items-center gap-3 border-b border-noir-border px-5 py-3 active:bg-noir-surface">
                      <Text className={`flex-1 font-inter text-base ${selected ? 'text-noir-gold' : 'text-noir-text'}`}>
                        {item.label}
                      </Text>
                      {item.hint ? <Text className="font-inter text-xs uppercase text-noir-copper">{item.hint}</Text> : null}
                      {selected ? <Ionicons name="checkmark" size={18} color={noir.gold} /> : null}
                    </Pressable>
                  );
                }}
              />
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
