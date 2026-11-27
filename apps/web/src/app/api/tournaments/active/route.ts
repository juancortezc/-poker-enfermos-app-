import { prisma } from '@/lib/prisma'
import { withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'

// GET /api/tournaments/active - Obtener el torneo activo actual (público)
export const GET = withErrorHandler(async () => {
  // Buscar primero torneo activo, si no existe, el más reciente
  let activeTournament = await prisma.tournament.findFirst({
    where: { status: 'ACTIVO' },
    include: {
      gameDates: {
        orderBy: { dateNumber: 'asc' }
      },
      tournamentParticipants: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              photoUrl: true
            }
          }
        }
      },
      blindLevels: {
        orderBy: { level: 'asc' }
      },
      _count: {
        select: {
          tournamentParticipants: true,
          gameDates: true
        }
      }
    }
  })

  // Si no hay torneo activo, buscar el más reciente
  if (!activeTournament) {
    activeTournament = await prisma.tournament.findFirst({
      orderBy: { number: 'desc' },
      include: {
        gameDates: {
          orderBy: { dateNumber: 'asc' }
        },
        tournamentParticipants: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                photoUrl: true
              }
            }
          }
        },
        blindLevels: {
          orderBy: { level: 'asc' }
        },
        _count: {
          select: {
            tournamentParticipants: true,
            gameDates: true
          }
        }
      }
    })
  }

  if (!activeTournament) {
    return ok({ tournament: null })
  }

  // Calcular estadísticas adicionales
  const completedGameDates = activeTournament.gameDates.filter(d => d.status === 'completed')
  const completedDates = completedGameDates.length
  const nextDate = activeTournament.gameDates.find(d => d.status === 'pending' || d.status === 'CREATED')
  const lastCompletedDate = completedGameDates.at(-1) ?? null
  // Ultima fecha jugada del grupo, aunque sea de un torneo anterior: al
  // arrancar un torneo (sin fechas jugadas) el Inicio sigue mostrando la
  // ultima noche (la del torneo que termino) en "Ultima Fecha".
  const lastPlayed = lastCompletedDate
    ? { ...lastCompletedDate, tournament: { id: activeTournament.id, number: activeTournament.number } }
    : await prisma.gameDate.findFirst({
        where: { status: 'completed', tournament: { number: { lt: activeTournament.number } } },
        orderBy: [{ tournament: { number: 'desc' } }, { dateNumber: 'desc' }],
        select: {
          id: true,
          dateNumber: true,
          scheduledDate: true,
          tournament: { select: { id: true, number: true } }
        }
      })
  const startDate = activeTournament.gameDates[0]?.scheduledDate
  const endDate = activeTournament.gameDates[activeTournament.gameDates.length - 1]?.scheduledDate

  return ok({
    tournament: activeTournament,
    stats: {
      completedDates,
      totalDates: activeTournament.gameDates.length,
      nextDate,
      lastCompletedDate: lastCompletedDate ? { id: lastCompletedDate.id, dateNumber: lastCompletedDate.dateNumber, scheduledDate: lastCompletedDate.scheduledDate } : null,
      lastPlayedDate: lastPlayed
        ? {
            id: lastPlayed.id,
            dateNumber: lastPlayed.dateNumber,
            scheduledDate: lastPlayed.scheduledDate,
            tournamentId: lastPlayed.tournament.id,
            tournamentNumber: lastPlayed.tournament.number
          }
        : null,
      startDate,
      endDate,
      isCompleted: completedDates === activeTournament.gameDates.length
    }
  })
})