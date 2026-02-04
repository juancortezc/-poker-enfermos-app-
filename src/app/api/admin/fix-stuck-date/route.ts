import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withComisionAuth } from '@/lib/api-auth'

/**
 * POST /api/admin/fix-stuck-date
 *
 * Fixes a game date that is stuck in "in_progress" when all players have been eliminated.
 * This can happen if the completion process fails or is interrupted.
 */
export async function POST(req: NextRequest) {
  return withComisionAuth(req, async (req) => {
    try {
      const { gameDateId } = await req.json()

      if (!gameDateId) {
        return NextResponse.json(
          { error: 'gameDateId is required' },
          { status: 400 }
        )
      }

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
          timerState: true
        }
      })

      if (!gameDate) {
        return NextResponse.json(
          { error: 'Game date not found' },
          { status: 404 }
        )
      }

      if (gameDate.status === 'completed') {
        return NextResponse.json({
          success: true,
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
        return NextResponse.json(
          { error: `Game date is in status ${gameDate.status}, expected 'in_progress'` },
          { status: 400 }
        )
      }

      // Check if we have all eliminations (including winner)
      const totalPlayers = gameDate.playerIds.length
      const totalEliminations = gameDate.eliminations.length
      const hasWinner = gameDate.eliminations.some(e => e.position === 1)

      // If we don't have a winner but all players except 1 have been eliminated,
      // we can't auto-complete - need to register winner first
      if (!hasWinner && totalEliminations === totalPlayers - 1) {
        const eliminatedPlayerIds = gameDate.eliminations.map(e => e.eliminatedPlayerId)
        const remainingPlayerId = gameDate.playerIds.find(id => !eliminatedPlayerIds.includes(id))

        if (remainingPlayerId) {
          const remainingPlayer = await prisma.player.findUnique({
            where: { id: remainingPlayerId },
            select: { id: true, firstName: true, lastName: true }
          })

          return NextResponse.json({
            success: false,
            error: 'Game date is missing the winner elimination',
            hint: 'Register the winner before completing the game date',
            remaining: {
              playersNotEliminated: 1,
              player: remainingPlayer
            },
            stats: {
              totalPlayers,
              totalEliminations,
              hasWinner: false
            }
          }, { status: 400 })
        }
      }

      // If we have all eliminations including winner, complete the date
      if (hasWinner && totalEliminations === totalPlayers) {
        // Update game date status
        await prisma.gameDate.update({
          where: { id: gameDateId },
          data: {
            status: 'completed',
            endTime: new Date()
          }
        })

        // Stop timer if exists
        if (gameDate.timerState) {
          await prisma.timerState.update({
            where: { id: gameDate.timerState.id },
            data: { status: 'inactive' }
          })
        }

        // Find winner and update lastVictoryDate
        const winner = gameDate.eliminations.find(e => e.position === 1)
        if (winner) {
          const scheduledDateStr = gameDate.scheduledDate.toLocaleDateString('es-EC')
          await prisma.player.update({
            where: { id: winner.eliminatedPlayerId },
            data: { lastVictoryDate: scheduledDateStr }
          })
        }

        return NextResponse.json({
          success: true,
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
      const eliminatedPlayerIds = gameDate.eliminations.map(e => e.eliminatedPlayerId)
      const remainingPlayerIds = gameDate.playerIds.filter(id => !eliminatedPlayerIds.includes(id))

      const remainingPlayers = await prisma.player.findMany({
        where: { id: { in: remainingPlayerIds } },
        select: { id: true, firstName: true, lastName: true }
      })

      return NextResponse.json({
        success: false,
        error: 'Game date has missing eliminations',
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
      }, { status: 400 })

    } catch (error) {
      console.error('Error fixing stuck game date:', error)
      return NextResponse.json(
        { error: 'Error processing request' },
        { status: 500 }
      )
    }
  })
}

/**
 * GET /api/admin/fix-stuck-date
 *
 * Get current stuck game dates (in_progress but potentially complete)
 */
export async function GET(req: NextRequest) {
  return withComisionAuth(req, async () => {
    try {
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
        const hasWinner = gd.eliminations.some(e => e.position === 1)
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

      return NextResponse.json({
        inProgressDates: analysis,
        stuckDates: analysis.filter(a => a.isStuck),
        fixableDates: analysis.filter(a => a.canBeFixed)
      })

    } catch (error) {
      console.error('Error getting stuck dates:', error)
      return NextResponse.json(
        { error: 'Error getting stuck dates' },
        { status: 500 }
      )
    }
  })
}
