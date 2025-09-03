import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { withAuth, withComisionAuth } from '@/lib/api-auth'

// GET /api/tournaments/[id]/participants - Obtener participantes de un torneo
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

      const participants = await prisma.tournamentParticipant.findMany({
        where: { tournamentId },
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              photoUrl: true,
              aliases: true,
              isActive: true
            }
          }
        },
        orderBy: {
          player: {
            firstName: 'asc'
          }
        }
      })

      return NextResponse.json(participants)
    } catch (error) {
      console.error('Error fetching tournament participants:', error)
      return NextResponse.json(
        { error: 'Error al obtener participantes del torneo' },
        { status: 500 }
      )
    }
  })
}

// POST /api/tournaments/[id]/participants - Agregar participante al torneo
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

      const { playerId } = data

      if (!playerId) {
        return NextResponse.json(
          { error: 'ID del jugador es obligatorio' },
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

      // Verificar que el jugador existe y es Enfermo o Comisión
      const player = await prisma.player.findUnique({
        where: { id: playerId }
      })

      if (!player) {
        return NextResponse.json(
          { error: 'Jugador no encontrado' },
          { status: 404 }
        )
      }

      if (player.role === UserRole.Invitado) {
        return NextResponse.json(
          { error: 'Los Invitados no pueden participar en torneos (solo pueden jugar fechas individuales)' },
          { status: 400 }
        )
      }

      if (!player.isActive) {
        return NextResponse.json(
          { error: 'El jugador no está activo' },
          { status: 400 }
        )
      }

      // Verificar que no esté ya participando
      const existingParticipant = await prisma.tournamentParticipant.findUnique({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId
          }
        }
      })

      if (existingParticipant) {
        return NextResponse.json(
          { error: 'El jugador ya está participando en este torneo' },
          { status: 400 }
        )
      }

      const participant = await prisma.tournamentParticipant.create({
        data: {
          tournamentId,
          playerId,
          confirmed: false
        },
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              photoUrl: true,
              aliases: true
            }
          }
        }
      })

      return NextResponse.json(participant, { status: 201 })
    } catch (error) {
      console.error('Error adding tournament participant:', error)
      return NextResponse.json(
        { error: 'Error al agregar participante al torneo' },
        { status: 500 }
      )
    }
  })
}

// DELETE /api/tournaments/[id]/participants - Remover participante del torneo
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(req, async (req) => {
    try {
      const { id } = await params
      const tournamentId = parseInt(id)
      const { searchParams } = new URL(req.url)
      const playerId = searchParams.get('playerId')

      if (isNaN(tournamentId)) {
        return NextResponse.json(
          { error: 'ID de torneo inválido' },
          { status: 400 }
        )
      }

      if (!playerId) {
        return NextResponse.json(
          { error: 'ID del jugador es obligatorio' },
          { status: 400 }
        )
      }

      const existingParticipant = await prisma.tournamentParticipant.findUnique({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId
          }
        }
      })

      if (!existingParticipant) {
        return NextResponse.json(
          { error: 'El jugador no está participando en este torneo' },
          { status: 404 }
        )
      }

      await prisma.tournamentParticipant.delete({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId
          }
        }
      })

      return NextResponse.json({
        message: 'Participante removido del torneo correctamente'
      })
    } catch (error) {
      console.error('Error removing tournament participant:', error)
      return NextResponse.json(
        { error: 'Error al remover participante del torneo' },
        { status: 500 }
      )
    }
  })
}