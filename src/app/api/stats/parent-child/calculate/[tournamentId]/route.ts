import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

// POST /api/stats/parent-child/calculate/[tournamentId] - Calcular estadísticas desde eliminaciones existentes
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  return withAuth(req, async (req, user) => {
    try {
      // Solo usuarios Comision pueden ejecutar este cálculo
      if (user.role !== 'Comision') {
        return NextResponse.json(
          { error: 'Solo la Comisión puede calcular estadísticas' },
          { status: 403 }
        )
      }

      const tournamentId = parseInt((await params).tournamentId)
      
      if (isNaN(tournamentId)) {
        return NextResponse.json(
          { error: 'ID de torneo inválido' },
          { status: 400 }
        )
      }

      // Verificar que el torneo existe
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          tournamentParticipants: {
            include: {
              player: {
                select: { id: true, role: true }
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

      // Obtener IDs de jugadores registrados (no invitados)
      const registeredPlayerIds = tournament.tournamentParticipants
        .filter(tp => tp.player.role !== 'Invitado')
        .map(tp => tp.playerId)

      // Obtener todas las eliminaciones del torneo
      const eliminations = await prisma.elimination.findMany({
        where: {
          gameDate: {
            tournamentId
          }
        },
        include: {
          gameDate: {
            select: { scheduledDate: true }
          }
        },
        orderBy: {
          gameDate: {
            scheduledDate: 'asc'
          }
        }
      })

      // Filtrar solo eliminaciones entre jugadores registrados
      const validEliminations = eliminations.filter(elim => 
        registeredPlayerIds.includes(elim.eliminatedPlayerId) &&
        registeredPlayerIds.includes(elim.eliminatorPlayerId)
      )

      // Agrupar eliminaciones por eliminador -> eliminado
      const eliminationMap = new Map<string, {
        eliminatedPlayerId: string
        eliminatorPlayerId: string
        count: number
        firstElimination: Date
        lastElimination: Date
      }>()

      for (const elimination of validEliminations) {
        const key = `${elimination.eliminatorPlayerId}-${elimination.eliminatedPlayerId}`
        const eliminationDate = elimination.gameDate.scheduledDate

        if (eliminationMap.has(key)) {
          const existing = eliminationMap.get(key)!
          existing.count += 1
          existing.lastElimination = eliminationDate
        } else {
          eliminationMap.set(key, {
            eliminatedPlayerId: elimination.eliminatedPlayerId,
            eliminatorPlayerId: elimination.eliminatorPlayerId,
            count: 1,
            firstElimination: eliminationDate,
            lastElimination: eliminationDate
          })
        }
      }

      // Limpiar estadísticas existentes del torneo
      await prisma.parentChildStats.deleteMany({
        where: { tournamentId }
      })

      // Crear nuevas estadísticas
      const newStats = []
      for (const [, data] of eliminationMap) {
        const isActiveRelation = data.count >= 3

        newStats.push({
          tournamentId,
          parentPlayerId: data.eliminatorPlayerId,
          childPlayerId: data.eliminatedPlayerId,
          eliminationCount: data.count,
          isActiveRelation,
          firstElimination: data.firstElimination,
          lastElimination: data.lastElimination
        })
      }

      // Insertar nuevas estadísticas
      if (newStats.length > 0) {
        await prisma.parentChildStats.createMany({
          data: newStats
        })
      }

      // Contar relaciones activas (≥3 eliminaciones)
      const activeRelations = newStats.filter(stat => stat.isActiveRelation).length

      return NextResponse.json({
        success: true,
        message: 'Estadísticas calculadas correctamente',
        stats: {
          totalEliminations: validEliminations.length,
          totalRelations: newStats.length,
          activeRelations,
          tournamentNumber: tournament.number
        }
      })

    } catch (error) {
      console.error('Error calculating parent-child stats:', error)
      return NextResponse.json(
        { error: 'Error al calcular estadísticas' },
        { status: 500 }
      )
    }
  })
}