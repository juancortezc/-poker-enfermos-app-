/**
 * Paleta Noir Jazz (CLAUDE.md > Noir Jazz UI System).
 *
 * Duplica los tokens de tailwind.config.js para los sitios donde no llega
 * className: opciones de navegación, StatusBar, color de iconos. Si cambias
 * uno, cambia el otro.
 */
export const noir = {
  bg: '#1F1410',
  surface: '#2A1B15',
  raised: '#33211A',
  gold: '#E0B66C',
  copper: '#A9441C',
  text: '#F3E6C5',
  muted: '#D7C59A',
  border: '#3C2219',
  danger: '#E5735A',
  /** Barra inferior: un punto más oscura que el fondo para separarla. */
  tabBar: '#160E0B',
} as const;

export const fonts = {
  heading: 'Cinzel_600SemiBold',
  headingBold: 'Cinzel_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;
