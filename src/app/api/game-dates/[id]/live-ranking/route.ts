import { NextRequest, NextResponse } from 'next/server'
import { readTimer } from '@/lib/timer-service'
import { calculateLiveRanking } from '@/lib/live-ranking'

export const dynamic = 'force-dynamic'

/**
 * GET /api/game-dates/[id]/live-ranking
 *
 * Todo lo que necesita el home durante una fecha en vivo: KPIs, la ultima
 * eliminacion y la tabla del torneo proyectada con los puntos del proximo
 * eliminado. Devuelve 409 si la fecha no esta en curso.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gameDateId = parseInt((await params).id, 10)
    if (Number.isNaN(gameDateId)) {
      return NextResponse.json({ error: 'ID de fecha invalido' }, { status: 400 })
    }

    const live = await calculateLiveRanking(gameDateId)
    if (!live) {
      return NextResponse.json({ error: 'La fecha no esta en curso' }, { status: 409 })
    }

    // Nivel de blinds actual, para el tercer KPI.
    //
    // Antes esta lectura llamaba a syncTimerLevel() y ESCRIBIA para hacer
    // subir el nivel: un GET que mutaba, con todas las pantallas abiertas
    // compitiendo por escribir lo mismo. Ahora el nivel se deriva del ancla,
    // asi que leer es solo leer.
    const timer = await readTimer(gameDateId)

    return NextResponse.json({
      ...live,
      currentBlind:
        timer.status === 'inactive' || timer.smallBlind === null
          ? null
          : {
              level: timer.level,
              smallBlind: timer.smallBlind,
              bigBlind: timer.bigBlind,
              timeRemaining: Math.round(timer.remainingMs / 1000),
              status: timer.status
            }
    })
  } catch (error) {
    console.error('Error en live-ranking:', error)
    return NextResponse.json({ error: 'Error al calcular la fecha en vivo' }, { status: 500 })
  }
}
