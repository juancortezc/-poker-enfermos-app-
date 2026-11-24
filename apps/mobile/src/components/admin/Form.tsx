/**
 * Piezas de formulario Noir para las pantallas de Comisión: campo con
 * etiqueta, aviso de error, píldora de estado y fila de enlace.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Muted, Overline } from '@/components/ui/Typography';
import { fonts, noir } from '@/theme/colors';

type FieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
};

export function Field({ label, hint, error, style, ...input }: FieldProps) {
  return (
    <View className="gap-1.5">
      <Overline className="text-[11px]">{label}</Overline>
      <TextInput
        placeholderTextColor={`${noir.muted}80`}
        accessibilityLabel={label}
        style={[
          {
            minHeight: 48,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: error ? noir.danger : noir.border,
            backgroundColor: noir.surface,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontFamily: fonts.body,
            fontSize: 16,
            color: noir.text,
          },
          style,
        ]}
        {...input}
      />
      {error ? <Text className="font-inter text-xs text-noir-danger">{error}</Text> : null}
      {!error && hint ? <Muted className="text-xs">{hint}</Muted> : null}
    </View>
  );
}

export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      className="flex-row items-start gap-2 rounded-xl border border-noir-danger/50 bg-noir-danger/10 px-3 py-2.5">
      <Ionicons name="alert-circle-outline" size={18} color={noir.danger} />
      <Text className="flex-1 font-inter text-sm text-noir-danger">{message}</Text>
    </View>
  );
}

export function Notice({ tone = 'gold', children }: { tone?: 'gold' | 'danger' | 'ok'; children: React.ReactNode }) {
  const color = tone === 'danger' ? noir.danger : tone === 'ok' ? '#6ECB71' : noir.gold;
  return (
    <View className="flex-row items-start gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: `${color}66`, backgroundColor: `${color}14` }}>
      <Ionicons
        name={tone === 'ok' ? 'checkmark-circle-outline' : 'warning-outline'}
        size={18}
        color={color}
      />
      <Text className="flex-1 font-inter text-sm leading-5" style={{ color }}>
        {children}
      </Text>
    </View>
  );
}

export function Pill({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'gold' | 'ok' | 'copper' }) {
  const color = tone === 'gold' ? noir.gold : tone === 'ok' ? '#6ECB71' : tone === 'copper' ? noir.copper : noir.muted;
  return (
    <View className="rounded-full border px-2.5 py-1" style={{ borderColor: `${color}66`, backgroundColor: `${color}1F` }}>
      <Text className="font-inter-semibold text-[11px] uppercase tracking-[1px]" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

/** Fila táctil con ícono, título, subtítulo y chevron. */
export function LinkRow({
  icon,
  title,
  subtitle,
  onPress,
  tone = 'gold',
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  onPress: () => void;
  tone?: 'gold' | 'danger';
}) {
  const color = tone === 'danger' ? noir.danger : noir.gold;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className="min-h-[60px] flex-row items-center gap-3 rounded-2xl border border-noir-border bg-noir-surface px-4 py-3 active:bg-noir-raised">
      <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1F` }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View className="flex-1">
        <Text className="font-inter-semibold text-base text-noir-text">{title}</Text>
        {subtitle ? <Muted className="text-xs">{subtitle}</Muted> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={noir.muted} />
    </Pressable>
  );
}

/** Entero ≥ 0 a partir del texto del teclado numérico ('' → 0). */
export function toInt(text: string): number {
  const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}
