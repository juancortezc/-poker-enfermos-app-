import { NextRequest } from 'next/server'
import { idParamsSchema } from '@poker/shared'
import { calculateTournamentInsights } from '@/lib/ranking-utils'
import { withErrorHandler } from '@/lib/errors'
import { ok, parseParams } from '@/lib/http'

// GET /api/tournaments/[id]/insights - Rachas y récords de temporada (público)
export const GET = withErrorHandler(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id: tournamentId } = parseParams(await params, idParamsSchema)

    const insights = await calculateTournamentInsights(tournamentId)

    if (!insights) {
      return ok({
        streaks: { hot: [], cold: [] },
        seasonHighlights: { biggestJump: null, longestTop3Streak: null }
      })
    }

    return ok(insights)
  }
)
