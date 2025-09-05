import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withComisionAuth } from '@/lib/api-auth'
import { parseToUTCNoon } from '@/lib/date-utils'

// POST - Crear nueva fecha de juego
export async function POST(request: NextRequest) {
  return withComisionAuth(request, async (req, user) => {
    try {
      const data = await req.json()
      const {
        tournamentId,
        dateNumber,
        scheduledDate,
        playerIds,
        guestIds = []
      } = data

      // Validaciones
      if (!tournamentId || !dateNumber || !scheduledDate) {
        return NextResponse.json(
          { error: 'Datos obligatorios faltantes' },
          { status: 400 }
        )
      }

      if (!playerIds || playerIds.length === 0) {
        return NextResponse.json(
          { error: 'Debe seleccionar al menos un jugador' },
          { status: 400 }
        )
      }

      // Verificar que no existe ya una fecha con ese número para el torneo
      const existingDate = await prisma.gameDate.findFirst({
        where: {
          tournamentId: parseInt(tournamentId),
          dateNumber: parseInt(dateNumber)
        }
      })

      if (existingDate) {
        return NextResponse.json(
          { error: `Ya existe la fecha ${dateNumber} para este torneo` },
          { status: 400 }
        )
      }

      // Calcular puntos para el ganador basado en número de participantes
      const totalParticipants = playerIds.length + guestIds.length
      const pointsForWinner = calculateWinnerPoints(totalParticipants)

      // Crear la fecha de juego
      const gameDate = await prisma.gameDate.create({
        data: {
          tournamentId: parseInt(tournamentId),
          dateNumber: parseInt(dateNumber),
          scheduledDate: parseToUTCNoon(scheduledDate),
          playerIds: playerIds,
          status: 'pending',
          playersMin: Math.min(9, totalParticipants),
          playersMax: Math.max(24, totalParticipants)
        },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              number: true
            }
          }
        }
      })

      return NextResponse.json({
        gameDate: {
          ...gameDate,
          guestIds,
          totalParticipants,
          pointsForWinner
        }
      })
    } catch (error) {
      console.error('Error creating game date:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}

// Función para calcular puntos del ganador
function calculateWinnerPoints(totalParticipants: number): number {
  // Tabla de puntuación basada en el PDF del torneo
  if (totalParticipants >= 20) return 25
  if (totalParticipants >= 16) return 22
  if (totalParticipants >= 12) return 20
  if (totalParticipants >= 9) return 18
  return 15 // Mínimo
}