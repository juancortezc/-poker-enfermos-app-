import { prisma } from '../src/lib/prisma'

async function testStatsDirectly() {
  try {
    console.log('🧪 Testing Stats API Logic Directly...')
    
    const tournamentId = 1

    // Replicar la lógica de la API
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, number: true, name: true }
    })

    if (!tournament) {
      console.error('❌ Torneo no encontrado')
      return
    }

    console.log(`🏆 Torneo encontrado: ${tournament.name}`)

    // Obtener estadísticas de relaciones padre-hijo activas
    const parentChildStats = await prisma.parentChildStats.findMany({
      where: {
        tournamentId,
        isActiveRelation: true // Solo relaciones activas (≥3 eliminaciones)
      },
      include: {
        parentPlayer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            role: true
          }
        },
        childPlayer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            role: true
          }
        }
      },
      orderBy: [
        { eliminationCount: 'desc' }, // Más eliminaciones primero
        { lastElimination: 'desc' }   // Más recientes primero
      ]
    })

    console.log(`📊 Relaciones padre-hijo activas encontradas: ${parentChildStats.length}`)

    // Filtrar solo jugadores registrados en el torneo (no invitados)
    const filteredStats = parentChildStats.filter(stat => 
      stat.parentPlayer.role !== 'Invitado' && stat.childPlayer.role !== 'Invitado'
    )

    console.log(`👥 Después del filtro de invitados: ${filteredStats.length}`)

    for (const stat of filteredStats) {
      console.log(`🔥 ${stat.parentPlayer.firstName} ${stat.parentPlayer.lastName} → ${stat.childPlayer.firstName} ${stat.childPlayer.lastName} (${stat.eliminationCount} eliminaciones)`)
    }

    const result = {
      tournament,
      parentChildRelations: filteredStats,
      totalRelations: filteredStats.length
    }

    console.log('\n✅ API Logic Test Successful')
    console.log('📝 Response structure:', {
      tournament: result.tournament,
      totalRelations: result.totalRelations,
      relations: result.parentChildRelations.length
    })

  } catch (error) {
    console.error('❌ Error in direct test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  testStatsDirectly()
}

export default testStatsDirectly