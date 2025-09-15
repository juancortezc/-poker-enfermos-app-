import { prisma } from '@/lib/prisma'

/**
 * Actualiza las estadísticas padre-hijo cuando se crea una nueva eliminación
 */
export async function updateParentChildStats(
  tournamentId: number,
  eliminatorPlayerId: string,
  eliminatedPlayerId: string,
  eliminationDate: Date
) {
  try {
    // Verificar que ambos jugadores estén registrados en el torneo (no invitados)
    const participants = await prisma.tournamentParticipant.findMany({
      where: {
        tournamentId,
        playerId: {
          in: [eliminatorPlayerId, eliminatedPlayerId]
        }
      },
      include: {
        player: {
          select: { role: true }
        }
      }
    })

    // Solo procesar si ambos son jugadores registrados (no invitados)
    const isValidElimination = participants.length === 2 && 
      participants.every(p => p.player.role !== 'Invitado')

    if (!isValidElimination) {
      console.log('Eliminación no válida para estadísticas (involucra invitados)')
      return
    }

    // Buscar estadística existente
    const existingStat = await prisma.parentChildStats.findUnique({
      where: {
        tournamentId_parentPlayerId_childPlayerId: {
          tournamentId,
          parentPlayerId: eliminatorPlayerId,
          childPlayerId: eliminatedPlayerId
        }
      }
    })

    if (existingStat) {
      // Actualizar estadística existente
      const newCount = existingStat.eliminationCount + 1
      const isNowActive = newCount >= 3

      await prisma.parentChildStats.update({
        where: { id: existingStat.id },
        data: {
          eliminationCount: newCount,
          isActiveRelation: isNowActive,
          lastElimination: eliminationDate,
          updatedAt: new Date()
        }
      })

      console.log(`Estadística actualizada: ${eliminatorPlayerId} → ${eliminatedPlayerId} (${newCount} eliminaciones)`)
    } else {
      // Crear nueva estadística
      await prisma.parentChildStats.create({
        data: {
          tournamentId,
          parentPlayerId: eliminatorPlayerId,
          childPlayerId: eliminatedPlayerId,
          eliminationCount: 1,
          isActiveRelation: false, // Solo activa con ≥3 eliminaciones
          firstElimination: eliminationDate,
          lastElimination: eliminationDate
        }
      })

      console.log(`Nueva estadística creada: ${eliminatorPlayerId} → ${eliminatedPlayerId} (1 eliminación)`)
    }

  } catch (error) {
    console.error('Error actualizando estadísticas padre-hijo:', error)
    // No lanzar error para no afectar el flujo principal de eliminaciones
  }
}

/**
 * Recalcula todas las estadísticas de un torneo desde cero
 */
export async function recalculateAllStats(tournamentId: number) {
  try {
    console.log(`Recalculando estadísticas completas para torneo ${tournamentId}`)

    // Obtener jugadores registrados del torneo
    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      include: {
        player: {
          select: { id: true, role: true }
        }
      }
    })

    const registeredPlayerIds = participants
      .filter(p => p.player.role !== 'Invitado')
      .map(p => p.playerId)

    // Obtener todas las eliminaciones del torneo
    const eliminations = await prisma.elimination.findMany({
      where: {
        gameDate: { tournamentId }
      },
      include: {
        gameDate: {
          select: { scheduledDate: true }
        }
      },
      orderBy: {
        gameDate: { scheduledDate: 'asc' }
      }
    })

    // Filtrar eliminaciones válidas
    const validEliminations = eliminations.filter(elim => 
      registeredPlayerIds.includes(elim.eliminatedPlayerId) &&
      registeredPlayerIds.includes(elim.eliminatorPlayerId)
    )

    // Agrupar por eliminador → eliminado
    const statsMap = new Map<string, {
      eliminatorId: string
      eliminatedId: string
      count: number
      firstElimination: Date
      lastElimination: Date
    }>()

    for (const elimination of validEliminations) {
      const key = `${elimination.eliminatorPlayerId}-${elimination.eliminatedPlayerId}`
      const date = elimination.gameDate.scheduledDate

      if (statsMap.has(key)) {
        const existing = statsMap.get(key)!
        existing.count += 1
        existing.lastElimination = date
      } else {
        statsMap.set(key, {
          eliminatorId: elimination.eliminatorPlayerId,
          eliminatedId: elimination.eliminatedPlayerId,
          count: 1,
          firstElimination: date,
          lastElimination: date
        })
      }
    }

    // Limpiar estadísticas existentes
    await prisma.parentChildStats.deleteMany({
      where: { tournamentId }
    })

    // Crear nuevas estadísticas
    const newStats = Array.from(statsMap.values()).map(stat => ({
      tournamentId,
      parentPlayerId: stat.eliminatorId,
      childPlayerId: stat.eliminatedId,
      eliminationCount: stat.count,
      isActiveRelation: stat.count >= 3,
      firstElimination: stat.firstElimination,
      lastElimination: stat.lastElimination
    }))

    if (newStats.length > 0) {
      await prisma.parentChildStats.createMany({
        data: newStats
      })
    }

    const activeRelations = newStats.filter(s => s.isActiveRelation).length
    console.log(`Recálculo completado: ${newStats.length} relaciones, ${activeRelations} activas`)

    return { total: newStats.length, active: activeRelations }

  } catch (error) {
    console.error('Error en recálculo de estadísticas:', error)
    throw error
  }
}