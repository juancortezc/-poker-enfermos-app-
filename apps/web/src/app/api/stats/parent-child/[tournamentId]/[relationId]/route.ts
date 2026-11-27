import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseParams } from '@/lib/http'
import { withPhotosOfTournament } from '@/lib/tournament-photos'
import { parentChildRelationParamsSchema } from '@poker/shared'

// GET /api/stats/parent-child/[tournamentId]/[relationId] - Detalle de eliminaciones de una relación P&H
export const GET = withErrorHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string; relationId: string }> }
) => {
  const { tournamentId, relationId } = parseParams(await params, parentChildRelationParamsSchema)

  // Obtener la relación P&H
  const relation = await prisma.parentChildStats.findUnique({
    where: { id: relationId },
    include: {
      parentPlayer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true
        }
      },
      childPlayer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true
        }
      }
    }
  })

  if (!relation || relation.tournamentId !== tournamentId) {
    throw AppError.notFound('Relación no encontrada')
  }

  // Obtener todas las eliminaciones de esta relación
  const eliminations = await prisma.elimination.findMany({
    where: {
      eliminatorPlayerId: relation.parentPlayerId,
      eliminatedPlayerId: relation.childPlayerId,
      // El ganador figura como su propio eliminador en la posicion 1. El
      // contador de la tarjeta la excluye; esta lista no, y por eso el
      // numero y el detalle podian no cuadrar.
      position: { not: 1 },
      gameDate: {
        tournamentId
      }
    },
    include: {
      gameDate: {
        select: {
          id: true,
          dateNumber: true,
          scheduledDate: true
        }
      }
    },
    orderBy: {
      gameDate: {
        scheduledDate: 'asc'
      }
    }
  })

  // Fotos del torneo: en uno anterior al T31, las de entonces.
  return ok(await withPhotosOfTournament({
    relation: {
      id: relation.id,
      eliminationCount: relation.eliminationCount,
      isActiveRelation: relation.isActiveRelation,
      firstElimination: relation.firstElimination,
      lastElimination: relation.lastElimination,
      parentPlayer: relation.parentPlayer,
      childPlayer: relation.childPlayer
    },
    eliminations: eliminations.map(e => ({
      id: e.id,
      position: e.position,
      dateNumber: e.gameDate.dateNumber,
      scheduledDate: e.gameDate.scheduledDate
    }))
  }, tournamentId))
})
