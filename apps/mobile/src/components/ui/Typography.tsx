/**
 * Textos base Clean Poker. En RN cada Text necesita su fontFamily (no se
 * hereda como en la web), asi que conviene usar estos en vez de Text.
 *
 * - Title: Archivo 800 con tracking negativo (`.cp-display`)
 * - Overline: rotulo chico en mayuscula, Archivo 800 (bento `overline()`)
 * - Body / Muted: Inter
 */
import { Text, type TextProps } from 'react-native';

type Props = TextProps & { className?: string };

export function Title({ className = '', ...props }: Props) {
  return <Text className={`font-display text-2xl tracking-[-0.4px] text-cp-on-surface ${className}`} {...props} />;
}

export function Overline({ className = '', ...props }: Props) {
  return (
    <Text
      className={`font-display text-[11px] uppercase tracking-[1.8px] text-cp-on-surface-variant ${className}`}
      {...props}
    />
  );
}

export function Body({ className = '', ...props }: Props) {
  return <Text className={`font-inter text-base leading-relaxed text-cp-on-surface ${className}`} {...props} />;
}

export function Muted({ className = '', ...props }: Props) {
  return <Text className={`font-inter text-sm leading-relaxed text-cp-on-surface-muted ${className}`} {...props} />;
}
