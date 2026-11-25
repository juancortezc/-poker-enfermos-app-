/**
 * Bloques del home (apps/web/src/components/clean-poker/bento.ts).
 *
 * Grilla de dos columnas donde cada bloque ocupa distinto espacio y tiene
 * distinto tratamiento. Sobre papel hacen falta ANCLAS: el negro, el rosa y el
 * verde vuelven como piezas dentro de la pantalla, no como el suelo de todo.
 *
 * Contraste del texto que va encima de cada variante:
 *   negro #17120F  blanco 18.6:1     rosa #AD1457  blanco 7.0:1
 *   verde #0F5C2C  blanco 8.1:1      oro claro     tinta 15.6:1
 */
import type { ShadowLayer } from './scale';

export type TileTone = 'papel' | 'negro' | 'rosa' | 'verde' | 'oro';

export type TileStyle = {
  /** Degradado a 150deg, de `from` a `to`. Con `from === to`, color plano. */
  from: string;
  to: string;
  /** Borde de 1px, si lleva. */
  border?: string;
  /** Color del texto. `null` = el on-surface del tono de la pantalla. */
  text: string | null;
  shadow: ShadowLayer;
};

export const tile: Record<TileTone, TileStyle> = {
  negro: { from: '#241D19', to: '#17120F', text: '#FFFFFF', shadow: { x: 0, y: 14, blur: 30, color: 'rgba(23,18,15,0.28)' } },
  rosa: { from: '#D81B60', to: '#AD1457', text: '#FFFFFF', shadow: { x: 0, y: 12, blur: 26, color: 'rgba(173,20,87,0.30)' } },
  verde: { from: '#15803D', to: '#0F5C2C', text: '#FFFFFF', shadow: { x: 0, y: 12, blur: 26, color: 'rgba(15,92,44,0.28)' } },
  oro: {
    from: '#FCF4DE',
    to: '#F3E6C2',
    border: 'rgba(138,101,8,0.30)',
    text: null,
    shadow: { x: 0, y: 10, blur: 24, color: 'rgba(23,18,15,0.07)' },
  },
  papel: {
    from: '#FFFFFF',
    to: '#FFFFFF',
    border: 'var(--cp-surface-border)',
    text: null,
    shadow: { x: 0, y: 6, blur: 18, color: 'rgba(23,18,15,0.05)' },
  },
};

/** El bloque rojo de "tu noche" (HomeUltimaFecha). */
export const tileRojo: TileStyle = {
  from: '#E53935',
  to: '#B32623',
  text: '#FFFFFF',
  shadow: { x: 0, y: 12, blur: 26, color: 'rgba(179,38,35,0.28)' },
};

/** Geometria comun de los bloques. */
export const tileLayout = { radius: 20, padding: 16, gap: 12, columns: 2 } as const;

/** Rotulo chico en mayuscula: el extremo bajo de la escala. */
export const overline = { size: 10.5, weight: 800, letterSpacing: 0.16 /* em */ } as const;

/** Texto sobre los bloques oscuros o de color. */
export const onColor = {
  strong: '#FFFFFF',
  soft: 'rgba(255,255,255,0.72)',
  faint: 'rgba(255,255,255,0.55)',
  line: 'rgba(255,255,255,0.16)',
} as const;

/** Metales del podio sobre papel / oro (las variantes -on-light). */
export const metalOnLight = ['#8A6508', '#6E6A67', '#8B5E2F'] as const;
/** Linea divisoria dentro del bloque oro. */
export const goldRule = 'rgba(138,101,8,0.22)';
