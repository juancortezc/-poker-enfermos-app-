/**
 * Tipografia, forma, espaciado, elevacion y movimiento de Clean Poker.
 * Valores de apps/web/src/styles/clean-poker-tokens.css.
 */

/** Familias. `web` es la pila CSS tal cual la usa la web (next/font). */
export const fontFamily = {
  /** Inter: el cuerpo. */
  body: 'Inter',
  /** Archivo: display, titulos, marcadores y rotulos. */
  display: 'Archivo',
  web: {
    body: "var(--font-inter), 'Inter', system-ui, -apple-system, sans-serif",
    display: "var(--font-display), 'Archivo', 'Helvetica Neue', Arial, sans-serif",
  },
} as const;

/** Pesos que usa el sistema. Display va en 800 (los titulares gigantes, 900). */
export const fontWeight = {
  regular: 400,
  body: 500,
  semibold: 600,
  bold: 700,
  display: 800,
  black: 900,
} as const;

/**
 * Escala. Piso duro de 12px para texto: por debajo no se lee en un telefono
 * y el publico son socios adultos leyendo de noche. 12px queda para los
 * overlines en mayuscula con letter-spacing; el texto explicativo va de 13
 * para arriba. (`caption` 11 y los rotulos de 10.5 del bento son las
 * excepciones que ya existen en la web.)
 */
export const fontSize = {
  micro: 12,
  caption: 13,
  body: 15,
  strong: 16,
  title: 18,
} as const;

/** Roles tipograficos (`--cp-display-size`, `--cp-title-size`...). */
export const typeRole = {
  display: { size: 40, weight: 800 },
  title: { size: 18, weight: 600 },
  titleMedium: { size: 16 },
  body: { size: 14, weight: 500 },
  label: { size: 12, weight: 500 },
  labelLarge: { size: 14 },
  caption: { size: 11, weight: 400 },
} as const;

/**
 * Tracking. Marcadores con tracking negativo (se leen como marcador, no como
 * texto); rotulos en mayuscula, abiertos.
 */
export const letterSpacing = {
  score: -0.03, // em
  display: -0.02, // em
  overline: 0.16, // em
} as const;

/** Radios. La interfaz va en 5px; los bloques del home (bento) en 20. */
export const radius = {
  sm: 5,
  md: 5,
  lg: 5,
  xl: 5,
  full: 9999,
  /** Tarjeta neutra de las pantallas claras (HomeCard). */
  card: 18,
  /** Bloques de la grilla del home (bento.ts). */
  tile: 20,
  /** Foto de jugador (HomeAvatar): cuadrada, sin anillo. */
  avatar: 8,
  /** Selector segmentado: contenedor y pildora. */
  segmented: 12,
  segmentedPill: 9,
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
} as const;

/** Sombra en partes, para traducirla a cualquier plataforma. */
export type ShadowLayer = { x: number; y: number; blur: number; color: string };

export const elevation = {
  dark: {
    1: [
      { x: 0, y: 1, blur: 2, color: 'rgba(0, 0, 0, 0.3)' },
      { x: 0, y: 2, blur: 6, color: 'rgba(0, 0, 0, 0.2)' },
    ],
    2: [
      { x: 0, y: 2, blur: 4, color: 'rgba(0, 0, 0, 0.3)' },
      { x: 0, y: 4, blur: 12, color: 'rgba(0, 0, 0, 0.25)' },
    ],
  },
  light: {
    1: [
      { x: 0, y: 1, blur: 2, color: 'rgba(23, 18, 15, 0.06)' },
      { x: 0, y: 2, blur: 8, color: 'rgba(23, 18, 15, 0.05)' },
    ],
    2: [
      { x: 0, y: 2, blur: 6, color: 'rgba(23, 18, 15, 0.07)' },
      { x: 0, y: 12, blur: 28, color: 'rgba(23, 18, 15, 0.08)' },
    ],
  },
} as const satisfies Record<string, Record<1 | 2, readonly ShadowLayer[]>>;

/** `0 1px 2px rgba(..), 0 2px 6px rgba(..)` */
export function boxShadow(layers: readonly ShadowLayer[]): string {
  return layers.map((l) => `${l.x} ${l.y}px ${l.blur}px ${l.color}`).join(', ');
}

export const motion = {
  fast: 150, // ms
  normal: 250, // ms
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Entrada escalonada por banda del home (`cp-rise`). */
  rise: { duration: 620, distance: 14, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', stagger: [0, 60, 110, 160, 220, 270, 320] },
  /** Cuenta del marcador al aparecer (easeOutCubic). */
  countUp: 900,
  /** Barra que se llena al aparecer. */
  fill: 900,
} as const;
