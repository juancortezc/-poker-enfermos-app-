import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TournamentStatus } from '@prisma/client'
import { withComisionAuth } from '@/lib/api-auth'
import { parseToUTCNoon } from '@/lib/date-utils'

// GET /api/tournaments - Listar todos los torneos
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') as TournamentStatus | null

    const where: { status?: TournamentStatus } = {}
    if (status) {
      where.status = status
    }

    const tournaments = await prisma.tournament.findMany({
      where,
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
        blindLevels: {
          orderBy: { level: 'asc' }
        },
        _count: {
          select: {
            tournamentParticipants: true,
            gameDates: true
          }
        }
      },
      orderBy: { number: 'desc' }
    })

    return NextResponse.json(tournaments)
  } catch (error) {
    console.error('Error fetching tournaments:', error)
    return NextResponse.json(
      { error: 'Error al obtener torneos' },
      { status: 500 }
    )
  }
}

// POST /api/tournaments - Crear nuevo torneo
export async function POST(req: NextRequest) {
  return withComisionAuth(req, async (req) => {
    try {
      const data = await req.json()
      const {
        number,
        gameDates, // Array de 12 fechas
        participantIds, // Array de IDs de jugadores
        blindLevels // Array de niveles de blinds
      } = data

      // Validaciones
      if (!number || number < 1) {
        return NextResponse.json(
          { error: 'El número del torneo es obligatorio' },
          { status: 400 }
        )
      }

      // Verificar que el número no esté en uso
      const existingTournament = await prisma.tournament.findUnique({
        where: { number }
      })
      
      if (existingTournament) {
        return NextResponse.json(
          { error: `Ya existe un torneo con el número ${number}` },
          { status: 400 }
        )
      }

      // Verificar restricción de un solo torneo activo
      const activeTournament = await prisma.tournament.findFirst({
        where: { status: 'ACTIVO' }
      })

      // Solo se puede tener un torneo activo a la vez
      if (activeTournament) {
        return NextResponse.json(
          { error: 'Ya existe un torneo activo. Complete el torneo actual antes de crear uno nuevo.' },
          { status: 400 }
        )
      }

      if (!gameDates || gameDates.length !== 12) {
        return NextResponse.json(
          { error: 'Debe programar exactamente 12 fechas' },
          { status: 400 }
        )
      }

      if (!participantIds || participantIds.length === 0) {
        return NextResponse.json(
          { error: 'Debe seleccionar al menos un participante' },
          { status: 400 }
        )
      }

      // Crear el torneo
      const tournament = await prisma.tournament.create({
        data: {
          name: `Torneo ${number}`,
          number,
          status: 'ACTIVO', // Los nuevos torneos se crean como activos
          participantIds,
          gameDates: {
            create: gameDates.map((date: { scheduledDate: string }, index: number) => ({
              dateNumber: index + 1,
              scheduledDate: parseToUTCNoon(date.scheduledDate),
              playersMin: 9,
              playersMax: 24
            }))
          },
          tournamentParticipants: {
            create: participantIds.map((playerId: string) => ({
              playerId,
              confirmed: false
            }))
          },
          blindLevels: {
            create: blindLevels || getDefaultBlindLevels()
          }
        },
        include: {
          gameDates: true,
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
          blindLevels: {
            orderBy: { level: 'asc' }
          }
        }
      })

      return NextResponse.json(tournament, { status: 201 })
    } catch (error) {
      console.error('Error creating tournament:', error)
      return NextResponse.json(
        { error: 'Error al crear torneo' },
        { status: 500 }
      )
    }
  })
}

// Niveles de blinds por defecto según la especificación (18 niveles)
function getDefaultBlindLevels() {
  return [
    { level: 1, smallBlind: 50, bigBlind: 100, duration: 12 },
    { level: 2, smallBlind: 100, bigBlind: 200, duration: 12 },
    { level: 3, smallBlind: 150, bigBlind: 300, duration: 12 },
    { level: 4, smallBlind: 200, bigBlind: 400, duration: 12 },
    { level: 5, smallBlind: 300, bigBlind: 600, duration: 12 },
    { level: 6, smallBlind: 400, bigBlind: 800, duration: 12 },
    { level: 7, smallBlind: 500, bigBlind: 1000, duration: 16 },
    { level: 8, smallBlind: 600, bigBlind: 1200, duration: 16 },
    { level: 9, smallBlind: 800, bigBlind: 1600, duration: 16 },
    { level: 10, smallBlind: 1000, bigBlind: 2000, duration: 16 },
    { level: 11, smallBlind: 1500, bigBlind: 3000, duration: 16 },
    { level: 12, smallBlind: 2000, bigBlind: 4000, duration: 10 },
    { level: 13, smallBlind: 3000, bigBlind: 6000, duration: 10 },
    { level: 14, smallBlind: 4000, bigBlind: 8000, duration: 10 },
    { level: 15, smallBlind: 5000, bigBlind: 10000, duration: 10 },
    { level: 16, smallBlind: 6000, bigBlind: 12000, duration: 10 },
    { level: 17, smallBlind: 8000, bigBlind: 16000, duration: 10 },
    { level: 18, smallBlind: 10000, bigBlind: 20000, duration: 0 } // Sin límite para el último nivel
  ]
}