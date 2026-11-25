import { NextRequest } from 'next/server'
import { timerControlSchema, timerParamsSchema } from '@poker/shared'
import { requireComision } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseParams, readJson } from '@/lib/http'
import { readTimer, applyTimerAction, TimerError } from '@/lib/timer-service'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ gameDateId: string }> }

/** TimerError conserva su status (404/409) y su `code`. */
function toAppError(error: unknown): unknown {
  if (error instanceof TimerError) return new AppError(error.message, error.status, error.code)
  return error
}

/**
 * GET /api/timer/[gameDateId] — estado actual. Publico: todos ven el mismo
 * reloj. Solo lee; el nivel avanza por calculo, no por escritura.
 */
export const GET = withErrorHandler(async (_request: NextRequest, { params }: Ctx) => {
  const { gameDateId } = parseParams(await params, timerParamsSchema)
  try {
    return ok(await readTimer(gameDateId))
  } catch (error) {
    throw toAppError(error)
  }
})

/**
 * POST /api/timer/[gameDateId] — control. Solo Comision.
 *
 * `start` es idempotente; `reset` vuelve al nivel 1 a proposito.
 * Una sola ruta para todas las acciones: todas hacen lo mismo (escribir un
 * ancla nueva) y tener cinco endpoints solo multiplicaba las copias.
 */
export const POST = withErrorHandler(async (request: NextRequest, { params }: Ctx) => {
  await requireComision(request)
  const { gameDateId } = parseParams(await params, timerParamsSchema)
  // Un body vacio o roto se trata como `{}`: sale 422 por la accion faltante.
  const raw = await readJson(request).catch(() => ({}))
  const { action } = timerControlSchema.parse(raw)

  try {
    return ok(await applyTimerAction(gameDateId, action))
  } catch (error) {
    throw toAppError(error)
  }
})
