/**
 * Timer de blinds. ENCENDIDO tras reescribirlo desde cero.
 *
 * Las dos veces anteriores se apago porque el estado se guardaba en
 * contadores mutables (timeRemaining, totalElapsed, pausedDuration) que se
 * desincronizaban con cada pausa. Ahora el estado es un ancla de tres datos y
 * el tiempo se DERIVA: ver lib/timer-engine, con su prueba en
 * scripts/test-timer-engine.ts, que reproduce una noche entera.
 */
export const TIMER_ENABLED = true
