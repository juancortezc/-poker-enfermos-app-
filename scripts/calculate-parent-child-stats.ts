import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function calculateParentChildStats() {
  try {
    console.log('🔄 Calculando estadísticas Padre-Hijo para Torneo 28...')
    
    // Obtener el torneo activo (debe ser Torneo 28)
    const tournament = await prisma.tournament.findFirst({
      where: { status: 'ACTIVO' },
      include: {
        tournamentParticipants: {
          include: {
            player: {
              select: { id: true, firstName: true, lastName: true, role: true }
            }
          }
        }
      }
    })

    if (!tournament) {
      console.error('❌ No se encontró torneo activo')
      return
    }

    console.log(`📋 Torneo encontrado: ${tournament.name} (ID: ${tournament.id})`)

    // Obtener jugadores registrados (no invitados)
    const registeredPlayers = tournament.tournamentParticipants
      .filter(tp => tp.player.role !== 'Invitado')
      .map(tp => ({
        id: tp.playerId,
        name: `${tp.player.firstName} ${tp.player.lastName}`,
        role: tp.player.role
      }))

    console.log(`👥 Jugadores registrados: ${registeredPlayers.length}`)

    // Obtener todas las eliminaciones del torneo
    const eliminations = await prisma.elimination.findMany({
      where: {
        gameDate: {
          tournamentId: tournament.id
        }
      },
      include: {
        gameDate: {
          select: { dateNumber: true, scheduledDate: true }
        },
        eliminatedPlayer: {
          select: { firstName: true, lastName: true, role: true }
        },
        eliminatorPlayer: {
          select: { firstName: true, lastName: true, role: true }
        }
      },
      orderBy: {
        gameDate: {
          scheduledDate: 'asc'
        }
      }
    })

    console.log(`🎯 Total eliminaciones en el torneo: ${eliminations.length}`)

    // Filtrar solo eliminaciones entre jugadores registrados
    const registeredPlayerIds = registeredPlayers.map(p => p.id)
    const validEliminations = eliminations.filter(elim => 
      registeredPlayerIds.includes(elim.eliminatedPlayerId) &&
      registeredPlayerIds.includes(elim.eliminatorPlayerId)
    )

    console.log(`✅ Eliminaciones válidas (entre jugadores registrados): ${validEliminations.length}`)

    // Agrupar eliminaciones por eliminador -> eliminado
    const eliminationMap = new Map<string, {
      eliminatedPlayerId: string
      eliminatorPlayerId: string
      eliminatedName: string
      eliminatorName: string
      count: number
      firstElimination: Date
      lastElimination: Date
      dates: number[]
    }>()

    for (const elimination of validEliminations) {
      const key = `${elimination.eliminatorPlayerId}-${elimination.eliminatedPlayerId}`
      const eliminationDate = elimination.gameDate.scheduledDate

      if (eliminationMap.has(key)) {
        const existing = eliminationMap.get(key)!
        existing.count += 1
        existing.lastElimination = eliminationDate
        existing.dates.push(elimination.gameDate.dateNumber)
      } else {
        eliminationMap.set(key, {
          eliminatedPlayerId: elimination.eliminatedPlayerId,
          eliminatorPlayerId: elimination.eliminatorPlayerId,
          eliminatedName: `${elimination.eliminatedPlayer.firstName} ${elimination.eliminatedPlayer.lastName}`,
          eliminatorName: `${elimination.eliminatorPlayer.firstName} ${elimination.eliminatorPlayer.lastName}`,
          count: 1,
          firstElimination: eliminationDate,
          lastElimination: eliminationDate,
          dates: [elimination.gameDate.dateNumber]
        })
      }
    }

    console.log(`📊 Relaciones únicas encontradas: ${eliminationMap.size}`)

    // Mostrar estadísticas detalladas
    console.log('\n📈 ANÁLISIS DE ELIMINACIONES:')
    const relationsByCount = new Map<number, number>()
    
    for (const [, data] of eliminationMap) {
      const count = data.count
      relationsByCount.set(count, (relationsByCount.get(count) || 0) + 1)
      
      if (count >= 3) {
        console.log(`🔥 PADRE-HIJO: ${data.eliminatorName} → ${data.eliminatedName} (${count} eliminaciones)`)
        console.log(`   Fechas: ${data.dates.sort().join(', ')}`)
      }
    }

    console.log('\n📊 DISTRIBUCIÓN DE ELIMINACIONES:')
    for (const [count, relations] of Array.from(relationsByCount.entries()).sort()) {
      console.log(`   ${count} eliminación(es): ${relations} relación(es)`)
    }

    // Limpiar estadísticas existentes del torneo
    console.log('\n🧹 Limpiando estadísticas existentes...')
    await prisma.parentChildStats.deleteMany({
      where: { tournamentId: tournament.id }
    })

    // Crear nuevas estadísticas
    const newStats = []
    for (const [, data] of eliminationMap) {
      const isActiveRelation = data.count >= 3

      newStats.push({
        tournamentId: tournament.id,
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
      console.log(`💾 Insertando ${newStats.length} registros...`)
      await prisma.parentChildStats.createMany({
        data: newStats
      })
    }

    // Contar relaciones activas (≥3 eliminaciones)
    const activeRelations = newStats.filter(stat => stat.isActiveRelation).length

    console.log('\n✅ PROCESO COMPLETADO:')
    console.log(`   📊 Total eliminaciones válidas: ${validEliminations.length}`)
    console.log(`   🔗 Total relaciones: ${newStats.length}`)
    console.log(`   🔥 Relaciones Padre-Hijo activas (≥3): ${activeRelations}`)
    console.log(`   🏆 Torneo: ${tournament.name}`)

  } catch (error) {
    console.error('❌ Error calculando estadísticas:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  calculateParentChildStats()
}

export default calculateParentChildStats