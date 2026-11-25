import { prisma } from '@/lib/prisma'
import { withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'

export const GET = withErrorHandler(async () => {
  // Buscar fecha activa (CREATED o in_progress para el botón de registro)
  const activeGameDate = await prisma.gameDate.findFirst({
    where: {
      status: {
        in: ['CREATED', 'in_progress']
      }
    },
    include: {
      tournament: {
        select: {
          id: true,
          name: true,
          number: true
        }
      }
    },
    orderBy: {
      dateNumber: 'asc'
    }
  })

  if (!activeGameDate) {
    return ok(null)
  }

  return ok({
    id: activeGameDate.id,
    dateNumber: activeGameDate.dateNumber,
    scheduledDate: activeGameDate.scheduledDate,
    status: activeGameDate.status,
    playerIds: activeGameDate.playerIds,
    tournament: activeGameDate.tournament,
    playersCount: activeGameDate.playerIds.length
  })
})