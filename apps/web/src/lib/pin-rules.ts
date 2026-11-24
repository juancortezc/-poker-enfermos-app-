// Reglas de la clave de acceso, sin dependencias de servidor.
// Vive aparte de pin-utils porque ese modulo importa Prisma y estas funciones
// las necesita tambien el navegador (formularios de login y de perfil).

/**
 * Reglas de la clave de acceso.
 *
 * Antes era exactamente 4 dígitos: 10.000 combinaciones, un espacio que se
 * agota por fuerza bruta en minutos. Ahora es alfanumérica.
 *
 * - Al INGRESAR se aceptan de 4 a 12 caracteres, para que las claves numéricas
 *   que ya existen sigan funcionando y nadie quede afuera.
 * - Al CREAR o CAMBIAR se exigen al menos 6. Así cada cambio fortalece, sin
 *   obligar a nadie a hacerlo de golpe.
 *
 * Se normaliza a minúsculas: el autocapitalizado del teclado del teléfono es
 * la causa número uno de "puse bien la clave y no entra". Los dígitos no
 * tienen mayúsculas, así que las claves actuales no cambian.
 */
export const PIN_MIN_LENGTH_LOGIN = 4
export const PIN_MIN_LENGTH_NEW = 6
export const PIN_MAX_LENGTH = 12

/** Deja la clave en la forma canónica con la que se hashea y se compara. */
export function normalizePin(pin: string): string {
  return pin.trim().toLowerCase()
}

/** Formato aceptado al iniciar sesión (incluye las claves numéricas viejas). */
export function isValidPinForLogin(pin: string): boolean {
  const p = normalizePin(pin)
  return p.length >= PIN_MIN_LENGTH_LOGIN && p.length <= PIN_MAX_LENGTH && /^[a-z0-9]+$/.test(p)
}

/** Formato exigido al crear o cambiar una clave. */
export function isValidPinForCreation(pin: string): boolean {
  const p = normalizePin(pin)
  return p.length >= PIN_MIN_LENGTH_NEW && p.length <= PIN_MAX_LENGTH && /^[a-z0-9]+$/.test(p)
}

export const PIN_RULE_TEXT = `Entre ${PIN_MIN_LENGTH_NEW} y ${PIN_MAX_LENGTH} caracteres, solo letras y números`
