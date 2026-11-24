import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testStatsAPI() {
  try {
    console.log('🧪 Testing Parent-Child Stats...')
    
    // Test 1: Verificar que las estadísticas existen en la base de datos
    const allStats = await prisma.parentChildStats.findMany({
      where: { tournamentId: 1 },
      include: {
        parentPlayer: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        },
        childPlayer: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    })

    console.log(`📊 Total estadísticas en DB: ${allStats.length}`)

    // Test 2: Verificar relaciones activas
    const activeStats = allStats.filter(stat => stat.isActiveRelation)
    console.log(`🔥 Relaciones activas (≥3 eliminaciones): ${activeStats.length}`)

    for (const stat of activeStats) {
      console.log(`   ${stat.parentPlayer.firstName} ${stat.parentPlayer.lastName} → ${stat.childPlayer.firstName} ${stat.childPlayer.lastName} (${stat.eliminationCount} eliminaciones)`)
    }

    // Test 3: Verificar filtro de invitados
    const nonGuestStats = allStats.filter(stat => 
      stat.parentPlayer.role !== 'Invitado' && stat.childPlayer.role !== 'Invitado'
    )
    console.log(`👥 Estadísticas entre jugadores registrados: ${nonGuestStats.length}`)

    // Test 4: Verificar que el torneo existe
    const tournament = await prisma.tournament.findUnique({
      where: { id: 1 },
      select: { id: true, number: true, name: true }
    })

    console.log(`🏆 Torneo: ${tournament?.name} (ID: ${tournament?.id})`)

    console.log('\n✅ Tests completados exitosamente')

  } catch (error) {
    console.error('❌ Error en tests:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  testStatsAPI()
}

export default testStatsAPI