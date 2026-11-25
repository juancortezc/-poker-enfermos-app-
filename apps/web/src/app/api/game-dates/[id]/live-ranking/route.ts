import { NextRequest } from 'next/server'
import { idParamsSchema } from '@poker/shared'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseParams } from '@/lib/http'
import { calculateLiveRanking } from '@/lib/live-ranking'

export const dynamic = 'force-dynamic'

/**
 * GET /api/game-dates/[id]/live-ranking
 *
 * Todo lo que necesita el home durante una fecha en vivo: KPIs, la ultima
 * eliminacion y la tabla del torneo proyectada con los puntos del proximo
 * eliminado. Devuelve 409 si la fecha no esta en curso.
 */
export const GET = withErrorHandler(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id: gameDateId } = parseParams(await params, idParamsSchema)

  const live = await calculateLiveRanking(gameDateId)
  if (!live) {
    throw AppError.conflict('La fecha no esta en curso', 'GAME_DATE_NOT_IN_PROGRESS')
  }

  // Ya no se lee el timer aqui. El tablero dejo de mostrar el blind, y esta
  // ruta se consulta cada 5 segundos desde CADA telefono de la mesa: eran
  // dos consultas por cliente cada 5s para un dato que se tiraba. Con diez
  // telefonos, 240 consultas por minuto de puro descarte.
  return ok(live)
})
