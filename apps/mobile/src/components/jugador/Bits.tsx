/**
 * Piezas chicas reutilizadas por las pantallas de jugador: fila de cifras,
 * etiqueta de sección con acción, fila clave/valor, buscador y enlace "→".
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Muted, Overline } from '@/components/ui/Typography';
import { fonts, noir } from '@/theme/colors';

/** Medallas: oro, plata y bronce (el "metal" de la web, sobre fondo oscuro). */
export const MEDAL = ['#E0B66C', '#C9C6C2', '#C08A54'] as const;
export const POSITIVE = '#6ECB71';
export const NEGATIVE = '#E8863C';
/** Rosa de los malazos 7/2, como en la web. */
export const MALAZO = '#EC4899';
/** Ámbar = proyectado, no jugado (tabla durante una fecha en curso). */
export const PROJECTED = '#F0B429';

export function Score({ value, size = 18, color = noir.text }: { value: string | number; size?: number; color?: string }) {
  return <Text style={{ fontFamily: fonts.bodyBold, fontSize: size, color, fontVariant: ['tabular-nums'] }}>{value}</Text>;
}

export type StatItem = { value: string | number; label: string; color?: string };

/** Fila de cifras separadas por líneas finas. */
export function StatRow({ items, valueSize = 18 }: { items: StatItem[]; valueSize?: number }) {
  return (
    <View className="flex-row">
      {items.map((s, i) => (
        <View key={s.label} className={`flex-1 ${i > 0 ? 'border-l border-noir-border pl-3' : ''}`}>
          <Score value={s.value} size={valueSize} color={s.color} />
          <Muted className="text-xs leading-tight">{s.label}</Muted>
        </View>
      ))}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View className="flex-row items-center justify-between">
      <Overline>{title}</Overline>
      {action && onAction ? <LinkCta title={action} onPress={onAction} /> : null}
    </View>
  );
}

export function LinkCta({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={10} className="min-h-[44px] justify-center active:opacity-60">
      <Text className="font-inter-bold text-xs uppercase tracking-[1.5px] text-noir-gold">{title} →</Text>
    </Pressable>
  );
}

export function KeyValue({ label, value, last = false }: { label: string; value: string | number; last?: boolean }) {
  return (
    <View className={`flex-row items-center justify-between py-3 ${last ? '' : 'border-b border-noir-border'}`}>
      <Muted className="text-sm">{label}</Muted>
      <Text className="font-inter-bold text-base text-noir-text">{value}</Text>
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder = 'Buscar por nombre…',
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View className="min-h-[48px] flex-row items-center gap-2 rounded-full border border-noir-border bg-noir-surface px-4">
      <Ionicons name="search" size={16} color={noir.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={`${noir.muted}99`}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: noir.text, paddingVertical: 10 }}
      />
    </View>
  );
}

/** Variación de puestos: ▲ verde, ▼ naranja, — gris. */
export function Delta({ value, size = 13 }: { value: number; size?: number }) {
  if (value === 0) return <Text style={{ fontFamily: fonts.bodyMedium, fontSize: size, color: `${noir.muted}88` }}>—</Text>;
  const up = value > 0;
  return (
    <Text style={{ fontFamily: fonts.bodyBold, fontSize: size, color: up ? POSITIVE : NEGATIVE }}>
      {up ? `+${value} ▲` : `${value} ▼`}
    </Text>
  );
}
