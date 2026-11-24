/**
 * Textos base Noir Jazz. En RN cada Text necesita su fontFamily (no se hereda
 * del contenedor como en la web), así que conviene usar estos en vez de Text.
 *
 * - Title / Overline: Cinzel (títulos y etiquetas en versalitas)
 * - Body / Muted: Inter, base 18px como la web
 */
import { Text, type TextProps } from 'react-native';

type Props = TextProps & { className?: string };

export function Title({ className = '', ...props }: Props) {
  return <Text className={`font-cinzel text-2xl text-noir-text tracking-wide ${className}`} {...props} />;
}

export function Overline({ className = '', ...props }: Props) {
  return (
    <Text className={`font-cinzel text-xs uppercase tracking-[3px] text-noir-gold ${className}`} {...props} />
  );
}

export function Body({ className = '', ...props }: Props) {
  return <Text className={`font-inter text-lg leading-relaxed text-noir-text ${className}`} {...props} />;
}

export function Muted({ className = '', ...props }: Props) {
  return <Text className={`font-inter text-sm leading-relaxed text-noir-muted ${className}`} {...props} />;
}
