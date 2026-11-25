/**
 * Variables CSS `--cp-*` con los mismos nombres que usa la web.
 */
import { CSS_VAR_NAMES, tones, type ColorName, type ToneName } from './color';
import { boxShadow, elevation, fontFamily, fontSize, motion, radius, space, typeRole } from './scale';

/** Variables que no son color (iguales en todos los tonos salvo la elevacion). */
function scaleVariables(tone: ToneName): Record<string, string> {
  const elev = tone === 'light' ? elevation.light : elevation.dark;
  return {
    '--cp-surface-blur': '16px',
    '--cp-text-micro': `${fontSize.micro}px`,
    '--cp-text-caption': `${fontSize.caption}px`,
    '--cp-text-body': `${fontSize.body}px`,
    '--cp-text-strong': `${fontSize.strong}px`,
    '--cp-text-title': `${fontSize.title}px`,
    '--cp-radius-sm': `${radius.sm}px`,
    '--cp-radius-md': `${radius.md}px`,
    '--cp-radius-lg': `${radius.lg}px`,
    '--cp-radius-xl': `${radius.xl}px`,
    '--cp-radius-full': `${radius.full}px`,
    '--cp-space-1': `${space[1]}px`,
    '--cp-space-2': `${space[2]}px`,
    '--cp-space-3': `${space[3]}px`,
    '--cp-space-4': `${space[4]}px`,
    '--cp-space-5': `${space[5]}px`,
    '--cp-space-6': `${space[6]}px`,
    '--cp-elevation-1': boxShadow(elev[1]),
    '--cp-elevation-2': boxShadow(elev[2]),
    '--cp-font': fontFamily.web.body,
    '--cp-font-display': fontFamily.web.display,
    '--cp-display-size': `${typeRole.display.size}px`,
    '--cp-display-weight': `${typeRole.display.weight}`,
    '--cp-title-size': `${typeRole.title.size}px`,
    '--cp-title-weight': `${typeRole.title.weight}`,
    '--cp-title-medium': `${typeRole.titleMedium.size}px`,
    '--cp-body-size': `${typeRole.body.size}px`,
    '--cp-body-weight': `${typeRole.body.weight}`,
    '--cp-label-size': `${typeRole.label.size}px`,
    '--cp-label-weight': `${typeRole.label.weight}`,
    '--cp-label-large': `${typeRole.labelLarge.size}px`,
    '--cp-caption-size': `${typeRole.caption.size}px`,
    '--cp-caption-weight': `${typeRole.caption.weight}`,
    '--cp-duration-fast': `${motion.fast}ms`,
    '--cp-duration-normal': `${motion.normal}ms`,
    '--cp-easing': motion.easing,
  };
}

/** Todas las variables `--cp-*` de un tono, ya resueltas (sin var()). */
export function cssVariableMap(tone: ToneName = 'dark'): Record<string, string> {
  const out: Record<string, string> = {};
  const colors = tones[tone];
  for (const key of Object.keys(CSS_VAR_NAMES) as ColorName[]) {
    out[CSS_VAR_NAMES[key]] = colors[key];
  }
  return { ...out, ...scaleVariables(tone) };
}

/** El bloque de declaraciones `--cp-x: valor;`, listo para un selector. */
export function toCssVariables(tone: ToneName = 'dark'): string {
  return Object.entries(cssVariableMap(tone))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
}
