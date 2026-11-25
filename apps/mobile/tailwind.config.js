// Clean Poker. Los valores salen de @poker/design (packages/design), la fuente
// unica que comparten la web y la app: aqui no se copia ningun color.
//
// Cada color se expone con el nombre de su variable en la web, sin el `--`:
// `bg-cp-surface-1`, `text-cp-on-surface-muted`, `border-cp-surface-border`,
// `text-cp-primary-light` (el rojo COMO TEXTO). Apuntan a variables, asi que
// cambian solas dentro de un subarbol claro (ver src/theme/tone.tsx), como
// `.cp-light` en la web.
//
// @poker/design es TypeScript: si el require normal falla, Tailwind recarga
// este archivo con jiti, que lo transpila.
const { CSS_VAR_NAMES, tones, radius } = require('@poker/design');

const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v);

/** { 'surface-1': 'rgb(var(--cp-surface-1) / <alpha-value>)', ... } */
const cp = {};
for (const [key, cssVar] of Object.entries(CSS_VAR_NAMES)) {
  if (!isHex(tones.dark[key])) continue; // los rgba (soft, glow) van por JS
  cp[cssVar.replace('--cp-', '')] = `rgb(var(${cssVar}) / <alpha-value>)`;
}


/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: { cp },
      borderRadius: {
        cp: `${radius.md}px`,
        card: `${radius.card}px`,
        tile: `${radius.tile}px`,
        avatar: `${radius.avatar}px`,
      },
      fontFamily: {
        // Archivo: display, titulos, marcadores, rotulos.
        display: ['Archivo_800ExtraBold'],
        'display-black': ['Archivo_900Black'],
        'display-bold': ['Archivo_700Bold'],
        // Inter: el cuerpo.
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
      },
    },
  },
  plugins: [],
};
