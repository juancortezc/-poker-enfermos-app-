import { DarkTheme, type Theme } from 'expo-router';

import { cp, fonts } from '@/theme/colors';

/**
 * Tema de React Navigation (fondos entre transiciones, etc.). Cada `Screen`
 * ajusta la cabecera a su tono al montarse (ver components/ui/Screen.tsx).
 */
export const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: cp.primary,
    background: cp.surface0,
    card: cp.surface0,
    text: cp.onSurface,
    border: cp.surfaceBorder,
    notification: cp.primary,
  },
};

/** Cabecera nativa comun a todos los stacks. */
export const stackScreenOptions = {
  headerStyle: { backgroundColor: cp.surface0 },
  headerTintColor: cp.onSurface,
  headerTitleStyle: { fontFamily: fonts.display, color: cp.onSurface },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal' as const,
  contentStyle: { backgroundColor: cp.surface0 },
};
