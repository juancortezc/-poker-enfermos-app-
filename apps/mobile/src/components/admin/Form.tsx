/**
 * Piezas de formulario Clean Poker para las pantallas de Comisión: campo con
 * etiqueta, aviso de error, píldora de estado y fila de enlace.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Muted, Overline } from '@/components/ui/Typography';
import { alpha, fonts } from '@/theme/colors';
import { useCP } from '@/theme/tone';

type FieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
};

export function Field({ label, hint, error, style, ...input }: FieldProps) {
  const c = useCP();
  return (
    <View className="gap-1.5">
      <Overline className="text-[11px]">{label}</Overline>
      <TextInput
        placeholderTextColor={c.onSurfaceVariant}
        accessibilityLabel={label}
        style={[
          {
            minHeight: 48,
            borderRadius: 5,
            borderWidth: 1,
            borderColor: error ? c.primary : c.surfaceBorder,
            backgroundColor: c.surface1,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontFamily: fonts.body,
            fontSize: 16,
            color: c.onSurface,
          },
          style,
        ]}
        {...input}
      />
      {error ? <Text className="font-inter text-xs text-cp-primary-light">{error}</Text> : null}
      {!error && hint ? <Muted className="text-xs">{hint}</Muted> : null}
    </View>
  );
}

export function FormError({ message }: { message: string | null | undefined }) {
  const c = useCP();
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      className="flex-row items-start gap-2 rounded-cp border border-cp-primary/50 bg-cp-primary/10 px-3 py-2.5">
      <Ionicons name="alert-circle-outline" size={18} color={c.primaryLight} />
      <Text className="flex-1 font-inter text-sm text-cp-primary-light">{message}</Text>
    </View>
  );
}

/** warning: aviso (ámbar) · danger: bloqueo (rojo) · ok: hecho (verde). */
export function Notice({ tone = 'warning', children }: { tone?: 'warning' | 'danger' | 'ok'; children: React.ReactNode }) {
  const c = useCP();
  const color = tone === 'danger' ? c.primaryLight : tone === 'ok' ? c.positive : c.warning;
  return (
    <View
      className="flex-row items-start gap-2 rounded-cp border px-3 py-2.5"
      style={{ borderColor: alpha(color, 0.4), backgroundColor: alpha(color, 0.08) }}>
      <Ionicons name={tone === 'ok' ? 'checkmark-circle-outline' : 'warning-outline'} size={18} color={color} />
      <Text className="flex-1 font-inter text-sm leading-5" style={{ color }}>
        {children}
      </Text>
    </View>
  );
}

/** muted: cerrado · info: en curso / accionable · ok: listo · negative: pendiente o que resta. */
export function Pill({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'info' | 'ok' | 'negative' }) {
  const c = useCP();
  const color = tone === 'info' ? c.info : tone === 'ok' ? c.positive : tone === 'negative' ? c.negative : c.onSurfaceVariant;
  return (
    <View
      className="rounded-full border px-2.5 py-1"
      style={{ borderColor: alpha(color, 0.4), backgroundColor: alpha(color, 0.12) }}>
      <Text className="font-inter-semibold text-[11px] uppercase tracking-[1px]" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

/** Fila táctil con ícono, título, subtítulo y chevron (los menús de /mas y /admin). */
export function LinkRow({
  icon,
  title,
  subtitle,
  onPress,
  tone = 'primary',
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  onPress: () => void;
  tone?: 'primary' | 'danger';
}) {
  const c = useCP();
  const color = tone === 'danger' ? c.negative : c.primaryLight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className="min-h-[60px] flex-row items-center gap-3 rounded-card border border-cp-surface-border bg-cp-surface-1 px-4 py-3 active:bg-cp-surface-2">
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: alpha(tone === 'danger' ? c.negative : c.primary, 0.12) }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View className="flex-1">
        <Text className="font-inter-semibold text-base text-cp-on-surface">{title}</Text>
        {subtitle ? <Muted className="text-xs">{subtitle}</Muted> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.onSurfaceVariant} />
    </Pressable>
  );
}

/** Entero ≥ 0 a partir del texto del teclado numérico ('' → 0). */
export function toInt(text: string): number {
  const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}
