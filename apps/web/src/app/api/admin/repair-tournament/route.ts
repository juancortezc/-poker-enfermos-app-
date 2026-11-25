import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireComision } from '@/lib/api-auth'
import { parseToUTCNoon } from '@/lib/date-utils'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody, parseQuery } from '@/lib/http'
import { repairTournamentQuerySchema, repairTournamentSchema } from '@poker/shared'

interface RepairResult {
  participantSync: {
    missingInTable: number
    addedToTable: number
    removedInvitados: number
  }
  dateFixing: {
    datesChecked: number
    datesFixed: number
  }
  finalStatus: {
    participants: number
    completedDates: number
    totalEliminations: number
  }
}

// POST /api/admin/repair-tournament - Repair tournament data issues
export const POST = withErrorHandler(async (req: NextRequest) => {
  await requireComision(req)
  const { tournamentId } = await parseBody(req, repairTournamentSchema)

  const result: RepairResult = {
    participantSync: {
      missingInTable: 0,
      addedToTable: 0,
      removedInvitados: 0
    },
    dateFixing: {
      datesChecked: 0,
      datesFixed: 0
    },
    finalStatus: {
      participants: 0,
      completedDates: 0,
      totalEliminations: 0
    }
  }

  // Get tournament data
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tournamentParticipants: true,
      gameDates: true
    }
  })

  if (!tournament) {
    throw AppError.notFound('Tournament not found')
  }

  // 1. Fix participant synchronization
  const participantTableIds = tournament.tournamentParticipants.map(tp => tp.playerId)
  const missingInTable = tournament.participantIds.filter(id => !participantTableIds.includes(id))
  
  result.participantSync.missingInTable = missingInTable.length

  for (const playerId of missingInTable) {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, role: true }
    })
    
    if (player && player.role !== 'Invitado') {
      await prisma.tournamentParticipant.create({
        data: {
          tournamentId: tournament.id,
          playerId: playerId,
          confirmed: false
        }
      })
      result.participantSync.addedToTable++
    } else if (player && player.role === 'Invitado') {
      result.participantSync.removedInvitados++
    }
  }

  // Update participantIds array to match TournamentParticipant table
  const updatedParticipants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId: tournament.id },
    select: { playerId: true }
  })
  
  const correctParticipantIds = updatedParticipants.map(p => p.playerId)
  
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: {
      participantIds: correctParticipantIds
    }
  })

  // 2. Fix date timezone issues
  for (const gameDate of tournament.gameDates) {
    result.dateFixing.datesChecked++
    
    const date = new Date(gameDate.scheduledDate)
    const dayOfWeek = date.getUTCDay()
    
    // If the date is not Tuesday (2), fix it
    if (dayOfWeek !== 2) {
      // Parse the date properly and ensure it's Tuesday
      const correctedDate = parseToUTCNoon(gameDate.scheduledDate.toISOString())
      
      // Adjust to nearest Tuesday if needed
      const correctedDayOfWeek = correctedDate.getUTCDay()
      if (correctedDayOfWeek !== 2) {
        // Move to nearest Tuesday
        let daysToAdjust = 2 - correctedDayOfWeek
        if (Math.abs(daysToAdjust) > 3) {
          daysToAdjust = daysToAdjust > 0 ? daysToAdjust - 7 : daysToAdjust + 7
        }
        correctedDate.setUTCDate(correctedDate.getUTCDate() + daysToAdjust)
      }
      
      await prisma.gameDate.update({
        where: { id: gameDate.id },
        data: { scheduledDate: correctedDate }
      })
      
      result.dateFixing.datesFixed++
    }
  }

  // 3. Get final status
  const finalTournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tournamentParticipants: true,
      gameDates: {
        where: { status: 'completed' },
        include: {
          eliminations: true
        }
      }
    }
  })

  if (finalTournament) {
    result.finalStatus.participants = finalTournament.tournamentParticipants.length
    result.finalStatus.completedDates = finalTournament.gameDates.length
    result.finalStatus.totalEliminations = finalTournament.gameDates.reduce(
      (sum, gd) => sum + gd.eliminations.length, 
      0
    )
  }

  return ok({
    tournamentId,
    repairs: result
  })
})

// GET /api/admin/repair-tournament - Check tournament health
export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireComision(req)
  const { tournamentId } = parseQuery(req, repairTournamentQuerySchema)

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tournamentParticipants: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      },
      gameDates: {
        include: {
          eliminations: true,
          _count: {
            select: {
              eliminations: true
            }
          }
        },
        orderBy: { dateNumber: 'asc' }
      }
    }
  })

  if (!tournament) {
    throw AppError.notFound('Tournament not found')
  }

  // Analyze issues
  const participantTableIds = tournament.tournamentParticipants.map(tp => tp.playerId)
  const missingInTable = tournament.participantIds.filter(id => !participantTableIds.includes(id))
  const extraInTable = participantTableIds.filter(id => !tournament.participantIds.includes(id))

  const dateIssues = tournament.gameDates.filter(gd => {
    const date = new Date(gd.scheduledDate)
    return date.getUTCDay() !== 2 // Not Tuesday
  })

  const completedDates = tournament.gameDates.filter(gd => gd.status === 'completed')
  const totalEliminations = tournament.gameDates.reduce(
    (sum, gd) => sum + gd._count.eliminations,
    0
  )

  return ok({
    tournament: {
      id: tournament.id,
      name: tournament.name,
      number: tournament.number,
      status: tournament.status
    },
    analysis: {
      participants: {
        inArray: tournament.participantIds.length,
        inTable: tournament.tournamentParticipants.length,
        missingInTable: missingInTable.length,
        extraInTable: extraInTable.length,
        hasIssues: missingInTable.length > 0 || extraInTable.length > 0
      },
      dates: {
        total: tournament.gameDates.length,
        withDateIssues: dateIssues.length,
        completed: completedDates.length,
        hasIssues: dateIssues.length > 0
      },
      eliminations: {
        total: totalEliminations,
        datesWithEliminations: tournament.gameDates.filter(gd => gd._count.eliminations > 0).length,
        hasIssues: completedDates.length > 0 && totalEliminations === 0
      }
    },
    needsRepair: 
      missingInTable.length > 0 || 
      extraInTable.length > 0 || 
      dateIssues.length > 0 ||
      (completedDates.length > 0 && totalEliminations === 0)
  })
})