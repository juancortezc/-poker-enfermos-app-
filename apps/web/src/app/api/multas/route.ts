import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withComisionAuth } from '@/lib/api-auth'
import { withErrorHandler } from '@/lib/errors'
import { ok, parseBody, parseQuery } from '@/lib/http'
import { createMultaSchema, multasQuerySchema } from '@poker/shared'

// GET /api/multas - Lista de multas, filtrable por torneo y/o jugador (público, se muestra a todos los usuarios)
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { tournamentId, playerId } = parseQuery(req, multasQuerySchema)

  const where: Record<string, unknown> = {}
  if (tournamentId) where.tournamentId = tournamentId
  if (playerId) where.playerId = playerId

  const adjustments = await prisma.playerAdjustment.findMany({
    where,
    include: {
      player: {
        select: { id: true, firstName: true, lastName: true, photoUrl: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return ok(adjustments)
})

// POST /api/multas - Registrar una nueva multa (solo Comision)
export const POST = withErrorHandler(async (req: NextRequest) => {
  return withComisionAuth(req, async (req, user) => {
    const { tournamentId, playerId, reason, pointsPenalty, chipsAmount, moneyAmount, paid } =
      await parseBody(req, createMultaSchema)

    const adjustment = await prisma.playerAdjustment.create({
      data: {
        tournamentId,
        playerId,
        reason,
        pointsPenalty,
        chipsAmount,
        moneyAmount,
        paid,
        createdById: user.id
      },
      include: {
        player: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true }
        }
      }
    })

    return ok(adjustment, 201)
  })
})
