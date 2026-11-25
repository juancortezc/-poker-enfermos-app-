import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireUser(request)
  // FIRST: Check if there are any CREATED or in_progress dates
  // If so, block all date creation
  const activeOrCreatedDate = await prisma.gameDate.findFirst({
    where: {
      status: {
        in: ['CREATED', 'in_progress']
      }
    }
  })

  // If there's an active or created date, return empty available dates
  if (activeOrCreatedDate) {
    console.log('🚫 Blocking date creation - found active date:', {
      dateNumber: activeOrCreatedDate.dateNumber,
      status: activeOrCreatedDate.status
    })
    
    return ok({
      tournament: null,
      availableDates: [], // Empty - no dates can be created
      registeredPlayers: [],
      additionalPlayers: [],
      blocked: true,
      blockedReason: `Existe una fecha ${activeOrCreatedDate.dateNumber} en estado ${activeOrCreatedDate.status}`,
      blockedDate: {
        id: activeOrCreatedDate.id,
        dateNumber: activeOrCreatedDate.dateNumber,
        status: activeOrCreatedDate.status
      }
    })
  }

  // Obtener el torneo activo
  const activeTournament = await prisma.tournament.findFirst({
    where: { status: 'ACTIVO' },
    include: {
      gameDates: {
        where: {
          status: {
            notIn: ['completed', 'CREATED', 'in_progress']  // Only allow pending dates when no active dates exist
          }
        },
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
              photoUrl: true,
              isActive: true
            }
          }
        }
      }
    }
  })

  if (!activeTournament) {
    throw AppError.notFound('No hay torneo activo', 'NO_ACTIVE_TOURNAMENT')
  }

  // Get all active players for additional selection
  const allActivePlayers = await prisma.player.findMany({
    where: {
      isActive: true,
      OR: [
        { role: 'Comision' },
        { role: 'Enfermo' }
      ]
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      photoUrl: true,
      isActive: true
    }
  })

  const registeredPlayers = activeTournament.tournamentParticipants
    .filter(tp => tp.player.isActive)
    .map(tp => tp.player)

  // Get players not registered in tournament
  const registeredPlayerIds = registeredPlayers.map(p => p.id)
  const availableAdditionalPlayers = allActivePlayers.filter(p => !registeredPlayerIds.includes(p.id))

  // Map available game dates for dropdown
  const availableDates = activeTournament.gameDates.map(gd => ({
    dateNumber: gd.dateNumber,
    scheduledDate: gd.scheduledDate.toISOString().split('T')[0],
    status: gd.status,
    id: gd.id
  }))

  // Check for missing dates (deleted dates that need to be recreated)
  // Get all dates for this tournament to find gaps
  const allTournamentDates = await prisma.gameDate.findMany({
    where: { tournamentId: activeTournament.id },
    select: { dateNumber: true, status: true },
    orderBy: { dateNumber: 'asc' }
  })

  const existingDateNumbers = allTournamentDates.map(d => d.dateNumber)
  const completedDates = allTournamentDates.filter(d => d.status === 'completed')
  const maxCompletedDate = completedDates.length > 0
    ? Math.max(...completedDates.map(d => d.dateNumber))
    : 0

  // Find the next date that should be playable
  // It's either: a pending date, OR the next date after completed ones that's missing
  const totalDates = activeTournament.totalDates ?? 12
  const nextExpectedDate = maxCompletedDate + 1
  const missingDate = !existingDateNumbers.includes(nextExpectedDate) && nextExpectedDate <= totalDates
    ? nextExpectedDate
    : null

  return ok({
    tournament: {
      id: activeTournament.id,
      name: activeTournament.name,
      number: activeTournament.number,
      totalDates: activeTournament.totalDates ?? 12,
      datesToEliminate: activeTournament.datesToEliminate ?? 2
    },
    availableDates: availableDates,
    registeredPlayers: registeredPlayers,
    additionalPlayers: availableAdditionalPlayers,
    missingDate: missingDate // Date number that needs to be recreated
  })
})