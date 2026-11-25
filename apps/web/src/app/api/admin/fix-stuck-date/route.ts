import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireComision } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody } from '@/lib/http'
import { fixStuckDateSchema } from '@poker/shared'

/**
 * POST /api/admin/fix-stuck-date
 *
 * Fixes a game date that is stuck in "in_progress" when all players have been eliminated.
 * This can happen if the completion process fails or is interrupted.
 *
 * Errores: 404 NOT_FOUND, 400 INVALID_STATUS / WINNER_NOT_FOUND /
 * MISSING_ELIMINATIONS (este con `details`: hint, remaining, stats).
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  await requireComision(req)
  const { gameDateId } = await parseBody(req, fixStuckDateSchema)

  // Get the game date with all its data
  const gameDate = await prisma.gameDate.findUnique({
    where: { id: gameDateId },
    include: {
      tournament: {
        select: { id: true, name: true, number: true }
      },
      eliminations: {
        include: {
          eliminatedPlayer: {
            select: { id: true, firstName: true, lastName: true }
          }
        },
        orderBy: { position: 'asc' }
      },
      timerStates: true
    }
  })

  if (!gameDate) {
    throw AppError.notFound('Game date not found')
  }

  if (gameDate.status === 'completed') {
    return ok({
      message: 'Game date is already completed',
      alreadyCompleted: true,
      gameDate: {
        id: gameDate.id,
        dateNumber: gameDate.dateNumber,
        status: gameDate.status
      }
    })
  }

  if (gameDate.status !== 'in_progress') {
    throw AppError.badRequest(
      `Game date is in status ${gameDate.status}, expected 'in_progress'`,
      'INVALID_STATUS'
    )
  }

  // Check if we have all eliminations (including winner)
  const totalPlayers = gameDate.playerIds.length
  const totalEliminations = gameDate.eliminations.length
  const hasWinner = gameDate.eliminations.some((e: { position: number }) => e.position === 1)

  // If we don't have a winner but all players except 1 have been eliminated,
  // auto-register the winner and complete the date
  if (!hasWinner && totalEliminations === totalPlayers - 1) {
    const eliminatedPlayerIds = gameDate.eliminations.map((e: { eliminatedPlayerId: string }) => e.eliminatedPlayerId)
    const remainingPlayerId = gameDate.playerIds.find(id => !eliminatedPlayerIds.includes(id))

    if (remainingPlayerId) {
      const remainingPlayer = await prisma.player.findUnique({
        where: { id: remainingPlayerId },
        select: { id: true, firstName: true, lastName: true }
      })

      if (!remainingPlayer) {
        throw AppError.badRequest('Could not find remaining player', 'WINNER_NOT_FOUND')
      }

      // Find the second place to calculate winner points
      const secondPlace = gameDate.eliminations.find((e: { position: number; points: number }) => e.position === 2)
      const winnerPoints = secondPlace ? secondPlace.points + 3 : totalPlayers + 10

      // Auto-register winner elimination (position 1)
      await prisma.elimination.create({
        data: {
          gameDateId: gameDate.id,
          position: 1,
          points: winnerPoints,
          eliminatedPlayerId: remainingPlayerId,
          eliminatorPlayerId: remainingPlayerId, // Winner eliminates themselves (convention)
          eliminationTime: new Date().toISOString(),
        }
      })

      // Update game date status
      await prisma.gameDate.update({
        where: { id: gameDateId },
        data: {
          status: 'completed'
        }
      })

      // Stop timer if exists
      if (gameDate.timerStates) {
        await prisma.timerState.update({
          where: { id: gameDate.timerStates.id },
          data: { status: 'inactive' }
        })
      }

      // Update winner's lastVictoryDate
      const scheduledDateStr = gameDate.scheduledDate.toLocaleDateString('es-EC')
      await prisma.player.update({
        where: { id: remainingPlayerId },
        data: { lastVictoryDate: scheduledDateStr }
      })

      return ok({
        message: 'Winner auto-registered and game date completed',
        gameDate: {
          id: gameDate.id,
          dateNumber: gameDate.dateNumber,
          previousStatus: 'in_progress',
          newStatus: 'completed',
          tournament: gameDate.tournament
        },
        winner: {
          playerId: remainingPlayerId,
          playerName: `${remainingPlayer.firstName} ${remainingPlayer.lastName}`,
          points: winnerPoints,
          autoRegistered: true
        },
        stats: {
          totalPlayers,
          totalEliminations: totalEliminations + 1
        }
      })
    }
  }

  // If we have all eliminations including winner, complete the date
  if (hasWinner && totalEliminations === totalPlayers) {
    // Update game date status
    await prisma.gameDate.update({
      where: { id: gameDateId },
      data: {
        status: 'completed'
      }
    })

    // Stop timer if exists
    if (gameDate.timerStates) {
      await prisma.timerState.update({
        where: { id: gameDate.timerStates.id },
        data: { status: 'inactive' }
      })
    }

    // Find winner and update lastVictoryDate
    const winner = gameDate.eliminations.find((e: { position: number }) => e.position === 1)
    if (winner) {
      const scheduledDateStr = gameDate.scheduledDate.toLocaleDateString('es-EC')
      await prisma.player.update({
        where: { id: winner.eliminatedPlayerId },
        data: { lastVictoryDate: scheduledDateStr }
      })
    }

    return ok({
      message: 'Game date marked as completed',
      gameDate: {
        id: gameDate.id,
        dateNumber: gameDate.dateNumber,
        previousStatus: 'in_progress',
        newStatus: 'completed',
        tournament: gameDate.tournament
      },
      winner: winner ? {
        playerId: winner.eliminatedPlayerId,
        playerName: `${winner.eliminatedPlayer.firstName} ${winner.eliminatedPlayer.lastName}`,
        points: winner.points
      } : null,
      stats: {
        totalPlayers,
        totalEliminations
      }
    })
  }

  // If we're missing eliminations
  const eliminatedPlayerIds = gameDate.eliminations.map((e: { eliminatedPlayerId: string }) => e.eliminatedPlayerId)
  const remainingPlayerIds = gameDate.playerIds.filter(id => !eliminatedPlayerIds.includes(id))

  const remainingPlayers = await prisma.player.findMany({
    where: { id: { in: remainingPlayerIds } },
    select: { id: true, firstName: true, lastName: true }
  })

  throw AppError.badRequest('Game date has missing eliminations', 'MISSING_ELIMINATIONS', {
    hint: `Register ${remainingPlayerIds.length} more elimination(s) to complete`,
    remaining: {
      playersNotEliminated: remainingPlayerIds.length,
      players: remainingPlayers
    },
    stats: {
      totalPlayers,
      totalEliminations,
      hasWinner
    }
  })
})

/**
 * GET /api/admin/fix-stuck-date
 *
 * Get current stuck game dates (in_progress but potentially complete)
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireComision(req)
  // Find all in_progress game dates
  const inProgressDates = await prisma.gameDate.findMany({
    where: { status: 'in_progress' },
    include: {
      tournament: {
        select: { id: true, name: true, number: true }
      },
      eliminations: {
        orderBy: { position: 'asc' }
      }
    }
  })

  const analysis = inProgressDates.map(gd => {
    const totalPlayers = gd.playerIds.length
    const totalEliminations = gd.eliminations.length
    const hasWinner = gd.eliminations.some((e: { position: number }) => e.position === 1)
    const isReadyToComplete = hasWinner && totalEliminations === totalPlayers

    return {
      id: gd.id,
      dateNumber: gd.dateNumber,
      tournament: gd.tournament,
      status: gd.status,
      totalPlayers,
      totalEliminations,
      hasWinner,
      remainingPlayers: totalPlayers - totalEliminations,
      isStuck: totalEliminations === totalPlayers || (hasWinner && totalEliminations >= totalPlayers - 1),
      isReadyToComplete,
      canBeFixed: isReadyToComplete
    }
  })

  return ok({
    inProgressDates: analysis,
    stuckDates: analysis.filter(a => a.isStuck),
    fixableDates: analysis.filter(a => a.canBeFixed)
  })
})
