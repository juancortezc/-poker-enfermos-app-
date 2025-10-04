import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withComisionAuth } from '@/lib/api-auth'
import { generateTournamentWinners } from '@/lib/tournament-winners'
import { sendNotificationIfEnabled } from '@/lib/notification-config'

// POST /api/tournaments/[id]/complete - Completar torneo activo
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(req, async (req) => {
    try {
      const { id } = await params
      const tournamentId = parseInt(id)
      const data = await req.json()

      if (isNaN(tournamentId)) {
        return NextResponse.json(
          { error: 'ID de torneo inválido' },
          { status: 400 }
        )
      }

      const { action, endDate } = data

      // Validar acción
      if (!['modify_date', 'complete_tournament'].includes(action)) {
        return NextResponse.json(
          { error: 'Acción inválida' },
          { status: 400 }
        )
      }

      // Verificar que el torneo existe y está activo
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          gameDates: {
            orderBy: { dateNumber: 'desc' },
            take: 1
          }
        }
      })

      if (!tournament) {
        return NextResponse.json(
          { error: 'Torneo no encontrado' },
          { status: 404 }
        )
      }

      if (tournament.status !== 'ACTIVO') {
        return NextResponse.json(
          { error: 'El torneo no está activo' },
          { status: 400 }
        )
      }

      if (action === 'modify_date') {
        // Modificar fecha final del torneo
        if (!endDate) {
          return NextResponse.json(
            { error: 'Fecha final requerida' },
            { status: 400 }
          )
        }

        const lastGameDate = tournament.gameDates[0]
        if (lastGameDate) {
          await prisma.gameDate.update({
            where: { id: lastGameDate.id },
            data: { scheduledDate: new Date(endDate) }
          })
        }

        return NextResponse.json({
          message: 'Fecha final actualizada correctamente'
        })
      } else if (action === 'complete_tournament') {
        // Completar torneo (cambiar status a FINALIZADO)
        const updatedTournament = await prisma.tournament.update({
          where: { id: tournamentId },
          data: {
            status: 'FINALIZADO',
            updatedAt: new Date()
          },
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
                    lastName: true
                  }
                }
              }
            }
          }
        })

        // Auto-generate TournamentWinners record
        let winnersGenerated = false
        let winnersError = null

        try {
          await generateTournamentWinners(prisma, tournamentId)
          winnersGenerated = true
          console.log(`✅ TournamentWinners auto-generated for Tournament ${updatedTournament.number}`)
        } catch (error) {
          winnersError = error instanceof Error ? error.message : 'Unknown error'
          console.error(`⚠️  Failed to auto-generate TournamentWinners for Tournament ${updatedTournament.number}:`, error)
          // Continue without failing the tournament completion
        }

        // Send notification about tournament completion (if enabled)
        await sendNotificationIfEnabled(
          'tournament_completed',
          '🏆 Torneo Completado',
          `El Torneo ${updatedTournament.number} ha sido finalizado oficialmente`,
          {
            tournamentId: updatedTournament.id,
            tournamentNumber: updatedTournament.number
          }
        )

        return NextResponse.json({
          message: 'Torneo completado correctamente',
          tournament: updatedTournament,
          winnersGenerated,
          winnersError
        })
      }
    } catch (error) {
      console.error('Error completing tournament:', error)
      return NextResponse.json(
        { error: 'Error al procesar la solicitud' },
        { status: 500 }
      )
    }
  })
}