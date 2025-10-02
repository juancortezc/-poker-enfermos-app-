import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

// GET - Obtener todos los participantes registrados para T29
export async function GET() {
  try {
    const participants = await prisma.t29Participant.findMany({
      orderBy: { registeredAt: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        registeredAt: true,
        player: {
          select: {
            id: true,
            photoUrl: true
          }
        }
      }
    })

    const count = participants.length

    return NextResponse.json({
      participants,
      count
    })
  } catch (error) {
    console.error('Error fetching T29 participants:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Registrar participación en T29
export async function POST(request: NextRequest) {
  return withAuth(request, async (_, user) => {
    try {
      // Verificar si el usuario ya está registrado
      const existingParticipant = await prisma.t29Participant.findUnique({
        where: { playerId: user.id }
      })

      if (existingParticipant) {
        return NextResponse.json(
          { error: 'Ya estás registrado para participar en T29' },
          { status: 409 }
        )
      }

      // Crear nuevo participante
      const participant = await prisma.t29Participant.create({
        data: {
          playerId: user.id,
          firstName: user.firstName,
          lastName: user.lastName
        }
      })

      return NextResponse.json({
        participant,
        message: 'Registrado exitosamente para T29'
      }, { status: 201 })
    } catch (error) {
      console.error('Error registering T29 participant:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}