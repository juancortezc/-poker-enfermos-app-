import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeTimerState } from '@/lib/timer-state'
import { calculateLiveRanking } from '@/lib/live-ranking'

export const dynamic = 'force-dynamic'

/**
 * GET /api/game-dates/[id]/live-ranking
 *
 * Todo lo que necesita el home durante una fecha en vivo: KPIs, la última
 * eliminación y la tabla del torneo proyectada con los puntos del próximo
 * eliminado. Devuelve 409 si la fecha no está en curso.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gameDateId = parseInt((await params).id, 10)
    if (Number.isNaN(gameDateId)) {
      return NextResponse.json({ error: 'ID de fecha inválido' }, { status: 400 })
    }

    const live = await calculateLiveRanking(gameDateId)
    if (!live) {
      return NextResponse.json({ error: 'La fecha no está en curso' }, { status: 409 })
    }

    // Nivel de blinds actual, para el tercer KPI.
    const [timerState, blindLevels] = await Promise.all([
      prisma.timerState.findUnique({ where: { gameDateId } }),
      prisma.gameDate
        .findUnique({
          where: { id: gameDateId },
          select: { tournament: { select: { blindLevels: { orderBy: { level: 'asc' } } } } }
        })
        .then((gd) => gd?.tournament.blindLevels ?? [])
    ])

    const computed = timerState ? computeTimerState(timerState) : null
    const current = blindLevels.find((bl) => bl.level === (computed?.currentLevel || 1)) ?? blindLevels[0] ?? null

    return NextResponse.json({
      ...live,
      currentBlind: current
        ? {
            level: current.level,
            smallBlind: current.smallBlind,
            bigBlind: current.bigBlind,
            timeRemaining: computed?.timeRemaining ?? 0,
            status: computed?.status ?? timerState?.status ?? 'inactive'
          }
        : null
    })
  } catch (error) {
    console.error('Error building live ranking:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
