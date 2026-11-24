/**
 * Reglas de la clave de acceso. Copia de src/lib/pin-rules.ts de la web.
 *
 * TODO(@poker/shared): mover a packages/shared junto con permissions.ts.
 *
 * Al ingresar se aceptan de 4 a 12 caracteres alfanuméricos (las claves
 * numéricas viejas siguen entrando). Se normaliza a minúsculas porque el
 * autocapitalizado del teclado es la causa número uno de "no entra".
 */
export const PIN_MIN_LENGTH_LOGIN = 4;
export const PIN_MIN_LENGTH_NEW = 6;
export const PIN_MAX_LENGTH = 12;

export function normalizePin(pin: string): string {
  return pin.trim().toLowerCase();
}

export function isValidPinForLogin(pin: string): boolean {
  const p = normalizePin(pin);
  return p.length >= PIN_MIN_LENGTH_LOGIN && p.length <= PIN_MAX_LENGTH && /^[a-z0-9]+$/.test(p);
}
