/**
 * Clean Poker en la app. Los valores viven en @poker/design (packages/design),
 * la fuente unica compartida con la web; aqui solo se reexportan con nombres
 * cortos para donde no llega className (StatusBar, iconos, navegacion).
 *
 * `cp` es el tono oscuro. Dentro de un componente que puede estar en una
 * pantalla clara usa `useCP()` (src/theme/tone.tsx), que devuelve el tono de
 * la pantalla.
 */
import { bento, tones, type ToneColors } from '@poker/design';

export type { ToneColors };

export const cp = tones.dark;
export const cpLight = tones.light;
export const cpPaper = tones.paper;
export { bento };

/** Familias cargadas en app/_layout.tsx (@expo-google-fonts). */
export const fonts = {
  display: 'Archivo_800ExtraBold',
  displayBlack: 'Archivo_900Black',
  /** Titulares de lucha libre del Inicio (T31). */
  displayBlackItalic: 'Archivo_900Black_Italic',
  displayBold: 'Archivo_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

/** `#RRGGBB` + opacidad 0–1 → `rgba(...)`. */
export function alpha(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`;
}

