import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseParams } from '@/lib/http'
import { tournamentIdParamsSchema, withTournamentPhotos } from '@poker/shared'

// GET /api/stats/parent-child/[tournamentId] - Obtener estadísticas Padre-Hijo (público)
export const GET = withErrorHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) => {
  const { tournamentId } = parseParams(await params, tournamentIdParamsSchema)

  // Verificar que el torneo existe
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, number: true, name: true }
  })

  if (!tournament) {
    throw AppError.notFound('Torneo no encontrado')
  }

  // Obtener estadísticas de relaciones padre-hijo activas (≥3 eliminaciones)
  const parentChildStats = await prisma.parentChildStats.findMany({
    where: {
      tournamentId,
      isActiveRelation: true // Solo relaciones activas (≥3 eliminaciones)
    },
    include: {
      parentPlayer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          role: true
        }
      },
      childPlayer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          role: true
        }
      }
    },
    orderBy: [
      { eliminationCount: 'desc' }, // Más eliminaciones primero
      { lastElimination: 'desc' }   // Más recientes primero
    ]
  })

  // Filtrar solo jugadores registrados en el torneo (no invitados)
  const filteredStats = parentChildStats.filter(stat =>
    stat.parentPlayer.role !== 'Invitado' && stat.childPlayer.role !== 'Invitado'
  )

  // Fotos del torneo: en uno anterior al T31, las de entonces.
  return ok(withTournamentPhotos({
    tournament,
    parentChildRelations: filteredStats,
    totalRelations: filteredStats.length
  }, tournament.number))
})
