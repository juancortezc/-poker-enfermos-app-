import { NextRequest, NextResponse } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import {
  readTimer,
  applyTimerAction,
  TimerError,
  TIMER_ACTIONS,
  type TimerAction,
} from '@/lib/timer-service'

export const dynamic = 'force-dynamic'

const ACCIONES = TIMER_ACTIONS

function parseId(raw: string): number | null {
  return /^\d+$/.test(raw) ? Number(raw) : null
}

function timerErrorResponse(error: unknown, fallback: string) {
  if (error instanceof TimerError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }
  console.error(`${fallback}:`, error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}

/**
 * GET /api/timer/[gameDateId] — estado actual. Publico: todos ven el mismo
 * reloj. Solo lee; el nivel avanza por calculo, no por escritura.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ gameDateId: string }> }
) {
  const gameDateId = parseId((await params).gameDateId)
  if (gameDateId === null) {
    return NextResponse.json({ error: 'ID de fecha invalido' }, { status: 400 })
  }

  try {
    return NextResponse.json(await readTimer(gameDateId))
  } catch (error) {
    return timerErrorResponse(error, 'Error leyendo el timer')
  }
}

/**
 * POST /api/timer/[gameDateId] — control. Solo Comision.
 *
 * `start` es idempotente; `reset` vuelve al nivel 1 a proposito.
 * Una sola ruta para todas las acciones: todas hacen lo mismo (escribir un
 * ancla nueva) y tener cinco endpoints solo multiplicaba las copias.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameDateId: string }> }
) {
  return withComisionAuth(request, async (req) => {
    const gameDateId = parseId((await params).gameDateId)
    if (gameDateId === null) {
      return NextResponse.json({ error: 'ID de fecha invalido' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const action = (body as { action?: unknown } | null)?.action as TimerAction | undefined

    if (typeof action !== 'string' || !ACCIONES.includes(action)) {
      return NextResponse.json(
        { error: `Accion invalida. Validas: ${ACCIONES.join(', ')}` },
        { status: 400 }
      )
    }

    try {
      return NextResponse.json(await applyTimerAction(gameDateId, action))
    } catch (error) {
      return timerErrorResponse(error, 'Error controlando el timer')
    }
  })
}
