/**
 * Piezas chicas reutilizadas por las pantallas de jugador: fila de cifras,
 * etiqueta de sección con acción, fila clave/valor, buscador y enlace "→".
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Muted, Overline } from '@/components/ui/Typography';
import { cp, fonts, type ToneColors } from '@/theme/colors';
import { useCP } from '@/theme/tone';

/**
 * Colores con significado, en el tono OSCURO. En componentes que pueden ir en
 * una pantalla clara usa las versiones `use*` o `useCP()`: sobre papel el oro,
 * el verde, el naranja y el rosa cambian a su variante legible.
 */
export const MEDAL = [cp.gold, cp.silver, cp.bronze] as const;
export const POSITIVE = cp.positive;
export const NEGATIVE = cp.negative;
/** Rosa de los malazos 7/2: identidad, como en la web. */
export const MALAZO = cp.malazo;
/** Ámbar = proyectado, no jugado (tabla durante una fecha en curso). */
export const PROJECTED = cp.warning;

/** Oro, plata y bronce del tono actual. */
export function medalsOf(c: ToneColors): readonly [string, string, string] {
  return [c.gold, c.silver, c.bronze];
}
export function useMedals() {
  return medalsOf(useCP());
}

/** Cifra de marcador: Archivo 800, ancho fijo y tracking negativo (`.cp-score`). */
export function Score({ value, size = 18, color }: { value: string | number; size?: number; color?: string }) {
  const c = useCP();
  return (
    <Text
      style={{
        fontFamily: fonts.display,
        fontSize: size,
        color: color ?? c.onSurface,
        fontVariant: ['tabular-nums'],
        letterSpacing: -0.03 * size,
      }}>
      {value}
    </Text>
  );
}

export type StatItem = { value: string | number; label: string; color?: string };

/** Fila de cifras separadas por líneas finas. */
export function StatRow({ items, valueSize = 18 }: { items: StatItem[]; valueSize?: number }) {
  return (
    <View className="flex-row">
      {items.map((s, i) => (
        <View key={s.label} className={`flex-1 ${i > 0 ? 'border-l border-cp-surface-border pl-3' : ''}`}>
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
      <Text className="font-inter-bold text-xs uppercase tracking-[0.6px] text-cp-primary-light">{title} →</Text>
    </Pressable>
  );
}

export function KeyValue({ label, value, last = false }: { label: string; value: string | number; last?: boolean }) {
  return (
    <View className={`flex-row items-center justify-between py-3 ${last ? '' : 'border-b border-cp-surface-border'}`}>
      <Muted className="text-sm">{label}</Muted>
      <Text className="font-inter-bold text-base text-cp-on-surface">{value}</Text>
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
  const c = useCP();
  return (
    <View className="min-h-[48px] flex-row items-center gap-2 rounded-cp border border-cp-surface-border bg-cp-surface-1 px-4">
      <Ionicons name="search" size={16} color={c.onSurfaceVariant} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.onSurfaceVariant}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: c.onSurface, paddingVertical: 10 }}
      />
    </View>
  );
}

/** Variación de puestos: ▲ verde, ▼ naranja, — gris. */
export function Delta({ value, size = 13 }: { value: number; size?: number }) {
  const c = useCP();
  if (value === 0) return <Text style={{ fontFamily: fonts.bodyMedium, fontSize: size, color: c.onSurfaceVariant }}>—</Text>;
  const up = value > 0;
  return (
    <Text style={{ fontFamily: fonts.bodyBold, fontSize: size, color: up ? c.positive : c.negative }}>
      {up ? `+${value} ▲` : `${value} ▼`}
    </Text>
  );
}
