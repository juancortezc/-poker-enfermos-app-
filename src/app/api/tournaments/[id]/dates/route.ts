import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withComisionAuth } from '@/lib/api-auth'

// GET /api/tournaments/[id]/dates - Obtener fechas de un torneo
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (req) => {
    try {
      const { id } = await params
      const tournamentId = parseInt(id)

      if (isNaN(tournamentId)) {
        return NextResponse.json(
          { error: 'ID de torneo inválido' },
          { status: 400 }
        )
      }

      const gameDates = await prisma.gameDate.findMany({
        where: { tournamentId },
        orderBy: { dateNumber: 'asc' },
        include: {
          gameResults: {
            include: {
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  photoUrl: true
                }
              }
            }
          },
          eliminations: {
            include: {
              eliminatedPlayer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  photoUrl: true
                }
              },
              eliminatorPlayer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  photoUrl: true
                }
              }
            }
          }
        }
      })

      return NextResponse.json(gameDates)
    } catch (error) {
      console.error('Error fetching tournament dates:', error)
      return NextResponse.json(
        { error: 'Error al obtener fechas del torneo' },
        { status: 500 }
      )
    }
  })
}

// POST /api/tournaments/[id]/dates - Crear nueva fecha
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

      const {
        dateNumber,
        scheduledDate,
        playersMin = 9,
        playersMax = 24
      } = data

      // Validaciones
      if (!dateNumber || dateNumber < 1 || dateNumber > 12) {
        return NextResponse.json(
          { error: 'Número de fecha debe estar entre 1 y 12' },
          { status: 400 }
        )
      }

      if (!scheduledDate) {
        return NextResponse.json(
          { error: 'Fecha programada es obligatoria' },
          { status: 400 }
        )
      }

      // Verificar que el torneo existe
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
      })

      if (!tournament) {
        return NextResponse.json(
          { error: 'Torneo no encontrado' },
          { status: 404 }
        )
      }

      // Verificar que no existe ya una fecha con ese número
      const existingDate = await prisma.gameDate.findFirst({
        where: {
          tournamentId,
          dateNumber
        }
      })

      if (existingDate) {
        return NextResponse.json(
          { error: `Ya existe la fecha número ${dateNumber}` },
          { status: 400 }
        )
      }

      const gameDate = await prisma.gameDate.create({
        data: {
          tournamentId,
          dateNumber,
          scheduledDate: new Date(scheduledDate),
          playersMin,
          playersMax,
          playerIds: []
        }
      })

      return NextResponse.json(gameDate, { status: 201 })
    } catch (error) {
      console.error('Error creating tournament date:', error)
      return NextResponse.json(
        { error: 'Error al crear fecha del torneo' },
        { status: 500 }
      )
    }
  })
}