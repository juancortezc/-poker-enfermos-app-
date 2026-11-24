import { NextRequest, NextResponse } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import { readTimer, applyTimerAction, type TimerAction } from '@/lib/timer-service'

export const dynamic = 'force-dynamic'

const ACCIONES: TimerAction[] = ['start', 'pause', 'resume', 'restart-level', 'advance']

/**
 * GET /api/timer/[gameDateId] — estado actual. Publico: todos ven el mismo
 * reloj. Solo lee; el nivel avanza por calculo, no por escritura.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ gameDateId: string }> }
) {
  const gameDateId = parseInt((await params).gameDateId, 10)
  if (Number.isNaN(gameDateId)) {
    return NextResponse.json({ error: 'ID de fecha invalido' }, { status: 400 })
  }

  try {
    return NextResponse.json(await readTimer(gameDateId))
  } catch (error) {
    console.error('Error leyendo el timer:', error)
    return NextResponse.json({ error: 'Error leyendo el timer' }, { status: 500 })
  }
}

/**
 * POST /api/timer/[gameDateId] — control. Solo Comision.
 *
 * Una sola ruta para las cinco acciones: todas hacen lo mismo (escribir un
 * ancla nueva) y tener cinco endpoints solo multiplicaba las copias.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameDateId: string }> }
) {
  return withComisionAuth(request, async (req) => {
    const gameDateId = parseInt((await params).gameDateId, 10)
    if (Number.isNaN(gameDateId)) {
      return NextResponse.json({ error: 'ID de fecha invalido' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const action = body?.action as TimerAction | undefined

    if (!action || !ACCIONES.includes(action)) {
      return NextResponse.json(
        { error: `Accion invalida. Validas: ${ACCIONES.join(', ')}` },
        { status: 400 }
      )
    }

    try {
      return NextResponse.json(await applyTimerAction(gameDateId, action))
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error controlando el timer'
      console.error('Error controlando el timer:', error)
      return NextResponse.json({ error: mensaje }, { status: 400 })
    }
  })
}
