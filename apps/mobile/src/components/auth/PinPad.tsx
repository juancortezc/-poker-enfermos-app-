/**
 * Teclado numérico grande para la clave. Las claves ahora pueden ser
 * alfanuméricas (pin-rules), así que la tecla "ABC" abre el teclado del
 * sistema; la mayoría sigue usando claves de números y entra con este pad.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

import { noir } from '@/theme/colors';

type Props = {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onLetters: () => void;
  disabled?: boolean;
};

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

function Key({
  children,
  onPress,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      className="h-[72px] flex-1 items-center justify-center rounded-2xl border border-noir-border bg-noir-surface active:bg-noir-raised active:border-noir-gold/60">
      {children}
    </Pressable>
  );
}

export function PinPad({ onDigit, onDelete, onLetters, disabled }: Props) {
  return (
    <View className="gap-3">
      {ROWS.map((row) => (
        <View key={row.join('')} className="flex-row gap-3">
          {row.map((d) => (
            <Key key={d} label={d} onPress={() => onDigit(d)} disabled={disabled}>
              <Text className="font-cinzel text-3xl text-noir-text">{d}</Text>
            </Key>
          ))}
        </View>
      ))}
      <View className="flex-row gap-3">
        <Key label="Escribir letras" onPress={onLetters} disabled={disabled}>
          <Text className="font-inter-semibold text-base tracking-[2px] text-noir-gold">ABC</Text>
        </Key>
        <Key label="0" onPress={() => onDigit('0')} disabled={disabled}>
          <Text className="font-cinzel text-3xl text-noir-text">0</Text>
        </Key>
        <Key label="Borrar" onPress={onDelete} disabled={disabled}>
          <Ionicons name="backspace-outline" size={28} color={noir.muted} />
        </Key>
      </View>
    </View>
  );
}
