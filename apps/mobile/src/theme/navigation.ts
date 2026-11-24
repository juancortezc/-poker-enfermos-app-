import { DarkTheme, type Theme } from 'expo-router';

import { fonts, noir } from '@/theme/colors';

/** Tema de React Navigation con la paleta Noir (fondos entre transiciones, etc.). */
export const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: noir.gold,
    background: noir.bg,
    card: noir.bg,
    text: noir.text,
    border: noir.border,
    notification: noir.copper,
  },
};

/** Cabecera nativa común a todos los stacks. */
export const stackScreenOptions = {
  headerStyle: { backgroundColor: noir.bg },
  headerTintColor: noir.gold,
  headerTitleStyle: { fontFamily: fonts.heading, color: noir.text },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal' as const,
  contentStyle: { backgroundColor: noir.bg },
};
