/**
 * Tono de pantalla: oscuro (`:root` de la web), claro (`.cp-light`) o papel
 * (`.cp-paper`, un bloque claro dentro de una pantalla oscura).
 *
 * Igual que en la web, el tono se aplica por subarbol: `ToneView` publica las
 * variables `--cp-*` del tono con `vars()` de NativeWind, asi que toda clase
 * `cp-*` de adentro (bg-cp-surface-1, text-cp-on-surface...) toma el valor
 * del tono sin tocar el componente. Para colores que van por JS (iconos,
 * spinners) se usa `useCP()`.
 */
import { CSS_VAR_NAMES, tones, type ColorName, type ToneColors, type ToneName } from '@poker/design';
import { vars } from 'nativewind';
import { createContext, useContext } from 'react';
import { View, type ViewProps } from 'react-native';

export type Tone = ToneName;

function rgbTriplets(colors: ToneColors): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(CSS_VAR_NAMES) as ColorName[]) {
    const v = colors[key];
    if (!/^#[0-9a-f]{6}$/i.test(v)) continue;
    const n = parseInt(v.slice(1), 16);
    out[CSS_VAR_NAMES[key]] = `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
  }
  return out;
}

const toneStyle = {
  dark: vars(rgbTriplets(tones.dark)),
  light: vars(rgbTriplets(tones.light)),
  paper: vars(rgbTriplets(tones.paper)),
};

const ToneContext = createContext<Tone>('dark');

export function useTone(): Tone {
  return useContext(ToneContext);
}

/** Colores del tono actual, para lo que no acepta className. */
export function useCP(): ToneColors {
  return tones[useContext(ToneContext)];
}

type Props = ViewProps & { tone: Tone; className?: string };

export function ToneView({ tone, style, ...rest }: Props) {
  return (
    <ToneContext.Provider value={tone}>
      <View style={[toneStyle[tone], style]} {...rest} />
    </ToneContext.Provider>
  );
}
