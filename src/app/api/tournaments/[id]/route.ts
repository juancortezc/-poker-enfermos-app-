import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TournamentStatus } from '@prisma/client'
import { withAuth, withComisionAuth } from '@/lib/api-auth'
import { parseToUTCNoon } from '@/lib/date-utils'

// GET /api/tournaments/[id] - Obtener torneo específico
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

      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
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
                  photoUrl: true,
                  aliases: true
                }
              }
            }
          },
          blindLevels: {
            orderBy: { level: 'asc' }
          },
          tournamentRankings: {
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
          }
        }
      })

      if (!tournament) {
        return NextResponse.json(
          { error: 'Torneo no encontrado' },
          { status: 404 }
        )
      }

      return NextResponse.json(tournament)
    } catch (error) {
      console.error('Error fetching tournament:', error)
      return NextResponse.json(
        { error: 'Error al obtener torneo' },
        { status: 500 }
      )
    }
  })
}

// PUT /api/tournaments/[id] - Actualizar torneo
export async function PUT(
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
        name,
        status,
        gameDates,
        participantIds,
        blindLevels
      } = data

      // Verificar que el torneo existe
      const existingTournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
      })

      if (!existingTournament) {
        return NextResponse.json(
          { error: 'Torneo no encontrado' },
          { status: 404 }
        )
      }

      // Preparar datos de actualización
      const updateData: any = {}
      
      if (name !== undefined) updateData.name = name.trim()
      if (status !== undefined) updateData.status = status as TournamentStatus
      if (participantIds !== undefined) updateData.participantIds = participantIds

      // Actualizar torneo
      const updatedTournament = await prisma.tournament.update({
        where: { id: tournamentId },
        data: updateData,
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
          }
        }
      })

      // Actualizar fechas si se proporcionaron
      if (gameDates && Array.isArray(gameDates)) {
        await Promise.all(
          gameDates.map((gameDate: any) => 
            prisma.gameDate.update({
              where: { 
                id: gameDate.id,
                tournamentId: tournamentId 
              },
              data: {
                scheduledDate: parseToUTCNoon(gameDate.scheduledDate),
                playersMin: gameDate.playersMin || 9,
                playersMax: gameDate.playersMax || 24
              }
            })
          )
        )
      }

      // Actualizar participantes si se proporcionaron
      if (participantIds && Array.isArray(participantIds)) {
        // Eliminar participantes actuales
        await prisma.tournamentParticipant.deleteMany({
          where: { tournamentId }
        })
        
        // Crear nuevos participantes
        await prisma.tournamentParticipant.createMany({
          data: participantIds.map((playerId: string) => ({
            tournamentId,
            playerId,
            confirmed: false
          }))
        })
      }

      // Actualizar blinds si se proporcionaron
      if (blindLevels && Array.isArray(blindLevels)) {
        // Eliminar blinds actuales
        await prisma.blindLevel.deleteMany({
          where: { tournamentId }
        })
        
        // Crear nuevos blinds
        await prisma.blindLevel.createMany({
          data: blindLevels.map((blind: any) => ({
            tournamentId,
            level: blind.level,
            smallBlind: blind.smallBlind,
            bigBlind: blind.bigBlind,
            duration: blind.duration
          }))
        })
      }

      return NextResponse.json(updatedTournament)
    } catch (error) {
      console.error('Error updating tournament:', error)
      return NextResponse.json(
        { error: 'Error al actualizar torneo' },
        { status: 500 }
      )
    }
  })
}

// DELETE /api/tournaments/[id] - Eliminar torneo (cancelar)
export async function DELETE(
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

      const existingTournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
      })

      if (!existingTournament) {
        return NextResponse.json(
          { error: 'Torneo no encontrado' },
          { status: 404 }
        )
      }

      // Eliminar torneo (cascade eliminará todo lo relacionado)
      await prisma.tournament.delete({
        where: { id: tournamentId }
      })

      return NextResponse.json({
        message: 'Torneo eliminado correctamente'
      })
    } catch (error) {
      console.error('Error deleting tournament:', error)
      return NextResponse.json(
        { error: 'Error al eliminar torneo' },
        { status: 500 }
      )
    }
  })
}