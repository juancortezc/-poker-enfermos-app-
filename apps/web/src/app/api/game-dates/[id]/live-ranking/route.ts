import { NextRequest, NextResponse } from 'next/server'
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

    // Ya no se lee el timer aqui. El tablero dejo de mostrar el blind, y esta
    // ruta se consulta cada 5 segundos desde CADA telefono de la mesa: eran
    // dos consultas por cliente cada 5s para un dato que se tiraba. Con diez
    // telefonos, 240 consultas por minuto de puro descarte.
    return NextResponse.json(live)
  } catch (error) {
    console.error('Error en live-ranking:', error)
    return NextResponse.json({ error: 'Error al calcular la fecha en vivo' }, { status: 500 })
  }
}
