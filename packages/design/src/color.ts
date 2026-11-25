/**
 * Colores de Clean Poker. Fuente unica para la web y la app movil.
 *
 * Valores tomados de apps/web/src/styles/clean-poker-tokens.css (`:root`,
 * `.cp-paper` y `.cp-light`). Cada clave se publica como `--cp-<nombre>` con
 * el nombre que ya usa la web (ver CSS_VAR_NAMES). La prueba de
 * tests/web-parity.test.ts compara cada valor con ese CSS.
 *
 * Una sola escala de superficies, un solo matiz: cinco pisos repartidos en 26
 * puntos de L*, todos con el matiz del rojo del club (hue 34) y croma bajo
 * constante. Seis puntos entre pisos hacen que una tarjeta se vea apoyada
 * sobre algo en vez de recortada en algo.
 *
 * Los ratios de contraste anotados son los medidos en la web.
 */

/** Tono oscuro: el `:root` de la web. */
export const dark = {
  // === SUPERFICIES === (L* medido en CIELAB; no intercalar valores sueltos)
  surface0: '#000000', //        negro plano: el suelo de la fecha en vivo
  surface1: '#2B2120', // L* 14 — tarjeta, fila de tabla
  surface2: '#382E2C', // L* 20 — elevada, hover, lider
  surface3: '#483E3C', // L* 27 — inputs, chips, separadores
  surface4: '#584E4C', // L* 34 — bordes vivos, encabezados

  // Alias por compatibilidad con la web.
  background: '#000000',
  backgroundSubtle: '#2B2120',
  surface: '#2B2120',
  surfaceSolid: '#2B2120',
  surfaceContainer: '#382E2C',
  surfaceElevated: '#382E2C',

  // Los bordes son neutros, no rojos.
  surfaceBorder: '#483E3C',
  outline: '#584E4C',
  outlineVariant: '#483E3C',

  // === PAPEL === reservado a lo que se celebra (podio, campeon, premios).
  paper: '#FBF7F2',
  paper2: '#F1EAE4',
  paperBorder: 'rgba(29, 22, 21, 0.12)',
  ink: '#1D1615', //  16.7:1 sobre papel
  ink2: '#574C49', //  7.8:1 sobre papel

  // === TEXTO SOBRE OSCURO === crema, no blanco puro.
  onSurface: '#F5EFE6', //        13.7:1 sobre surface-1
  onSurfaceMuted: '#C9BFBA', //    8.7:1 — secundario
  onSurfaceMedium: '#C9BFBA',
  onSurfaceVariant: '#9A8F8B', //  5.0:1 — terciario, piso de AA

  // === ROJO — marca, accion y estado ===
  // El rojo del club NO llega a 4.5:1 como texto (3.7:1 sobre surface-1):
  // `primary` para fondos, bordes y estados; `primaryLight` cuando es letra.
  primary: '#E53935',
  primaryVariant: '#C62828', //  fondo de boton: con texto blanco, 5.6:1
  primaryLight: '#FF6B6B', //    rojo COMO TEXTO sobre oscuro: 5.6:1
  primaryOnLight: '#C62828', //  rojo COMO TEXTO sobre papel: 5.3:1
  onPrimary: '#ffffff',

  // === INFORMATIVO — el color frio === fechas futuras, calendario, perfiles,
  // propuestas, avisos. Deja al rojo libre para premiar.
  info: '#5BC8C0', //          7.8:1 sobre surface-1
  infoOnLight: '#0F766E', //   5.1:1 sobre papel
  infoSoft: 'rgba(91, 200, 192, 0.12)',

  // === FEEDBACK === lo negativo va en naranja, nunca en rojo.
  positive: '#6ECB71', //          7.8:1 sobre surface-1
  positiveOnLight: '#15803D',
  success: '#6ECB71',
  negative: '#E8863C', //          5.9:1 sobre surface-1
  negativeOnLight: '#C2410C', //   4.9:1 sobre papel
  neutral: '#9A8F8B',
  warning: '#E8C158',

  // === PODIO === el oro brillante no se lee sobre papel (3.1:1).
  gold: '#E8C158',
  silver: '#C9C6C2',
  bronze: '#C08A54',
  goldOnLight: '#8A6508', //    5.0:1 sobre papel
  silverOnLight: '#6E6A67', //  5.0:1 sobre papel
  bronzeOnLight: '#8B5E2F', //  5.3:1 sobre papel

  // === ROSA — los malazos y todo el 7/2 === identidad, no decoracion.
  malazo: '#EC4899',
  malazoText: '#FF6FA5', //   rosa COMO TEXTO sobre oscuro: 6.0:1
  malazoBlock: '#D81B60', //  bloque con texto blanco: 5.0:1
  malazoDeep: '#AD1457', //   bloque, extremo oscuro: 7.0:1
  malazoSoft: 'rgba(236, 72, 153, 0.14)',

  // === ACENTOS ===
  chip: '#E8863C', // ficha de poker; misma familia que lo negativo
  magenta: '#C2185B',

  // === LIVE ===
  live: '#E53935',
  liveGlow: 'rgba(229, 57, 53, 0.5)',
} as const;

export type ColorName = keyof typeof dark;
export type ToneColors = { readonly [K in ColorName]: string };

/**
 * Tono claro: `.cp-light` de la web. El papel manda y el negro y el rojo pasan
 * a ser acento. Redefine los mismos tokens; los que `.cp-light` no toca quedan
 * con el valor oscuro, igual que en el CSS (las custom properties se
 * resuelven donde se declaran).
 */
export const light: ToneColors = {
  ...dark,
  surface0: '#FAF7F2', // el suelo
  surface1: '#FFFFFF', // tarjeta
  surface2: '#F3EDE4', // elevada, seleccionada
  surface3: '#E7DED2', // inputs, separadores
  surface4: '#CEC2B3', // bordes vivos

  background: '#FAF7F2',
  backgroundSubtle: '#F3EDE4',
  surface: '#FFFFFF',
  surfaceSolid: '#FFFFFF',
  surfaceContainer: '#F3EDE4',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: '#E7DED2',
  outline: '#CEC2B3',
  outlineVariant: '#E7DED2',

  // Tinta: el negro del club como TEXTO.
  onSurface: '#17120F', //        16.9:1 sobre el suelo
  onSurfaceMuted: '#574C49', //    7.6:1
  onSurfaceMedium: '#574C49',
  onSurfaceVariant: '#786B66', //  5.0:1

  // Sobre claro el rojo del club da 4.3:1 como texto: como texto va el oscuro.
  primary: '#E53935',
  primaryLight: '#C62828', // rojo COMO TEXTO: 5.2:1
  onPrimary: '#FFFFFF',

  negative: '#C2410C',
  positive: '#15803D',
  success: '#15803D',
  info: '#0F766E',
  warning: '#8A6508',

  malazo: '#D81B60',
  malazoText: '#C2185B', // 5.4:1 sobre el suelo

  gold: '#8A6508',
  silver: '#6E6A67',
  bronze: '#8B5E2F',
};

/**
 * Bloque de papel (`.cp-paper`) dentro de una pantalla oscura: reasigna texto
 * y feedback a sus variantes `-on-light`.
 */
export const paper: ToneColors = {
  ...dark,
  onSurface: dark.ink,
  onSurfaceMuted: dark.ink2,
  onSurfaceMedium: dark.ink2,
  onSurfaceVariant: dark.ink2,
  surfaceBorder: dark.paperBorder,
  negative: dark.negativeOnLight,
  positive: dark.positiveOnLight,
  primaryLight: dark.primaryOnLight,
  info: dark.infoOnLight,
  gold: dark.goldOnLight,
  silver: dark.silverOnLight,
  bronze: dark.bronzeOnLight,
};

export const tones = { dark, light, paper } as const;
export type ToneName = keyof typeof tones;

/** Nombre de la variable CSS de cada color, el mismo que usa la web. */
export const CSS_VAR_NAMES: { readonly [K in ColorName]: string } = {
  surface0: '--cp-surface-0',
  surface1: '--cp-surface-1',
  surface2: '--cp-surface-2',
  surface3: '--cp-surface-3',
  surface4: '--cp-surface-4',
  background: '--cp-background',
  backgroundSubtle: '--cp-background-subtle',
  surface: '--cp-surface',
  surfaceSolid: '--cp-surface-solid',
  surfaceContainer: '--cp-surface-container',
  surfaceElevated: '--cp-surface-elevated',
  surfaceBorder: '--cp-surface-border',
  outline: '--cp-outline',
  outlineVariant: '--cp-outline-variant',
  paper: '--cp-paper',
  paper2: '--cp-paper-2',
  paperBorder: '--cp-paper-border',
  ink: '--cp-ink',
  ink2: '--cp-ink-2',
  onSurface: '--cp-on-surface',
  onSurfaceMuted: '--cp-on-surface-muted',
  onSurfaceMedium: '--cp-on-surface-medium',
  onSurfaceVariant: '--cp-on-surface-variant',
  primary: '--cp-primary',
  primaryVariant: '--cp-primary-variant',
  primaryLight: '--cp-primary-light',
  primaryOnLight: '--cp-primary-on-light',
  onPrimary: '--cp-on-primary',
  info: '--cp-info',
  infoOnLight: '--cp-info-on-light',
  infoSoft: '--cp-info-soft',
  positive: '--cp-positive',
  positiveOnLight: '--cp-positive-on-light',
  success: '--cp-success',
  negative: '--cp-negative',
  negativeOnLight: '--cp-negative-on-light',
  neutral: '--cp-neutral',
  warning: '--cp-warning',
  gold: '--cp-gold',
  silver: '--cp-silver',
  bronze: '--cp-bronze',
  goldOnLight: '--cp-gold-on-light',
  silverOnLight: '--cp-silver-on-light',
  bronzeOnLight: '--cp-bronze-on-light',
  malazo: '--cp-malazo',
  malazoText: '--cp-malazo-text',
  malazoBlock: '--cp-malazo-block',
  malazoDeep: '--cp-malazo-deep',
  malazoSoft: '--cp-malazo-soft',
  chip: '--cp-chip',
  magenta: '--cp-magenta',
  live: '--cp-live',
  liveGlow: '--cp-live-glow',
};
