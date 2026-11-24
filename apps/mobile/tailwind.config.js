// Tokens Noir Jazz (ver CLAUDE.md > Noir Jazz UI System). Los mismos valores
// viven en src/theme/colors.ts para donde no llega className (tab bar,
// StatusBar, colores de iconos). Si cambias uno, cambia el otro.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        noir: {
          bg: '#1F1410',
          surface: '#2A1B15',
          raised: '#33211A',
          gold: '#E0B66C',
          copper: '#A9441C',
          text: '#F3E6C5',
          muted: '#D7C59A',
          border: '#3C2219',
          danger: '#E5735A',
        },
      },
      fontFamily: {
        cinzel: ['Cinzel_600SemiBold'],
        'cinzel-bold': ['Cinzel_700Bold'],
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
      },
    },
  },
  plugins: [],
};
