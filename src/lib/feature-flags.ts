/**
 * Timer de blinds. APAGADO desde 2026-09-16: volvio a fallar en una fecha en
 * vivo. Mientras este en false, /timer muestra "en mantenimiento" y /registro
 * no dibuja el bloque de blinds ni los controles de pausa/resume.
 *
 * Antes de volver a encenderlo hay que resolver la causa raiz de la falla, no
 * solo el sintoma: el historial es que se reactivo una vez y volvio a caer.
 */
export const TIMER_ENABLED = false
