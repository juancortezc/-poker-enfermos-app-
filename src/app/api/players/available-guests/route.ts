import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const tournamentId = searchParams.get('tournamentId')

      if (!tournamentId) {
        return NextResponse.json(
          { error: 'Tournament ID requerido' },
          { status: 400 }
        )
      }

      // Obtener participantes registrados en el torneo
      const tournament = await prisma.tournament.findUnique({
        where: { id: parseInt(tournamentId) },
        include: {
          tournamentParticipants: {
            select: {
              player: {
                select: { id: true }
              }
            }
          }
        }
      })

      if (!tournament) {
        return NextResponse.json(
          { error: 'Torneo no encontrado' },
          { status: 404 }
        )
      }

      const registeredPlayerIds = tournament.tournamentParticipants.map(
        tp => tp.player.id
      )

      // Obtener jugadores del grupo que NO están registrados en el torneo
      const groupMembers = await prisma.player.findMany({
        where: {
          isActive: true,
          role: {
            in: ['Enfermo', 'Comision']
          },
          id: {
            notIn: registeredPlayerIds
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          photoUrl: true
        },
        orderBy: [
          { role: 'asc' },
          { firstName: 'asc' }
        ]
      })

      // Obtener invitados externos
      const externalGuests = await prisma.player.findMany({
        where: {
          role: 'Invitado',
          isActive: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          photoUrl: true,
          inviter: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: [
          { firstName: 'asc' }
        ]
      })

      return NextResponse.json({
        groupMembers,
        externalGuests
      })
    } catch (error) {
      console.error('Error getting available guests:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}