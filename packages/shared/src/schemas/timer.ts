/** Esquemas de entrada de la API: timer. */
import { z, idParamSchema } from './common'

/** Acciones de POST /api/timer/[gameDateId]. Misma lista que TIMER_ACTIONS de la web. */
export const TIMER_ACTION_VALUES = ['start', 'reset', 'pause', 'resume', 'restart-level', 'advance'] as const

export const timerActionSchema = z.enum(TIMER_ACTION_VALUES, {
  error: `Acción inválida. Válidas: ${TIMER_ACTION_VALUES.join(', ')}`,
})

/** POST /api/timer/[gameDateId] */
export const timerControlSchema = z.object({ action: timerActionSchema })
export type TimerControlBody = z.input<typeof timerControlSchema>

/** Params de /api/timer/[gameDateId]. */
export const timerParamsSchema = z.object({ gameDateId: idParamSchema })
