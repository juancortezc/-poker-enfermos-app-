/**
 * @poker/design — Clean Poker, fuente unica de diseno para la web y la app.
 *
 *   import { tokens } from '@poker/design'
 *   tokens.color.primary            // tono oscuro (el `:root` de la web)
 *   tokens.tone.light.surface0      // tono claro (`.cp-light`)
 *   toCssVariables('light')         // bloque `--cp-*` para CSS
 */
import * as bento from './bento';
import { CSS_VAR_NAMES, dark, light, paper, tones } from './color';
import { elevation, fontFamily, fontSize, fontWeight, letterSpacing, motion, radius, space, typeRole } from './scale';

export * from './color';
export * from './scale';
export * from './css';
export { bento };
export type { TileStyle, TileTone } from './bento';

export const tokens = {
  color: dark,
  tone: tones,
  cssVar: CSS_VAR_NAMES,
  font: { family: fontFamily, weight: fontWeight, size: fontSize, role: typeRole, letterSpacing },
  radius,
  space,
  elevation,
  motion,
  bento,
} as const;

export { dark as darkColors, light as lightColors, paper as paperColors };
