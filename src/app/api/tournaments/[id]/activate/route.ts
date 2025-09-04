import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withComisionAuth } from '@/lib/api-auth'

// POST /api/tournaments/[id]/activate - Activar torneo próximo
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(req, async (req) => {
    try {
      const { id } = await params
      const tournamentId = parseInt(id)

      if (isNaN(tournamentId)) {
        return NextResponse.json(
          { error: 'ID de torneo inválido' },
          { status: 400 }
        )
      }

      // Verificar que el torneo existe y está en status PROXIMO
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
      })

      if (!tournament) {
        return NextResponse.json(
          { error: 'Torneo no encontrado' },
          { status: 404 }
        )
      }

      if (tournament.status !== 'PROXIMO') {
        return NextResponse.json(
          { error: 'Solo se pueden activar torneos en estado próximo' },
          { status: 400 }
        )
      }

      // Verificar que no hay otro torneo activo
      const activeTournament = await prisma.tournament.findFirst({
        where: { status: 'ACTIVO' }
      })

      if (activeTournament) {
        return NextResponse.json(
          { error: 'Ya existe un torneo activo. Debe completarlo antes de activar otro.' },
          { status: 400 }
        )
      }

      // Activar el torneo
      const updatedTournament = await prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'ACTIVO',
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
                  lastName: true,
                  role: true,
                  photoUrl: true
                }
              }
            }
          },
          _count: {
            select: {
              tournamentParticipants: true,
              gameDates: true
            }
          }
        }
      })

      return NextResponse.json({
        message: 'Torneo activado correctamente',
        tournament: updatedTournament
      })
    } catch (error) {
      console.error('Error activating tournament:', error)
      return NextResponse.json(
        { error: 'Error al activar torneo' },
        { status: 500 }
      )
    }
  })
}