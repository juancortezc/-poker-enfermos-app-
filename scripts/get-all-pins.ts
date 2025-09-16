import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getAllPins() {
  console.log('🔐 LISTA DE PINES - POKER DE ENFERMOS\n')
  console.log('============================================================')
  
  try {
    const players = await prisma.player.findMany({
      where: {
        isActive: true,
        role: {
          in: ['Comision', 'Enfermo']
        }
      },
      select: {
        firstName: true,
        lastName: true,
        role: true,
        pin: true,
        adminKey: true
      },
      orderBy: [
        { role: 'asc' }, // Comision first
        { firstName: 'asc' }
      ]
    })

    console.log(`\n📋 Total de usuarios activos: ${players.length}\n`)

    // Separate by role
    const comision = players.filter(p => p.role === 'Comision')
    const enfermos = players.filter(p => p.role === 'Enfermo')

    console.log('👑 COMISIÓN (Admin Access):')
    console.log('----------------------------------------')
    comision.forEach(player => {
      console.log(`• ${player.firstName} ${player.lastName}`)
      console.log(`  PIN: ${player.pin}`)
      if (player.adminKey) {
        console.log(`  ADMIN KEY: ${player.adminKey}`)
      }
      console.log('')
    })

    console.log('\n🎮 ENFERMOS (Player Access):')
    console.log('----------------------------------------')
    enfermos.forEach(player => {
      console.log(`• ${player.firstName} ${player.lastName}`)
      console.log(`  PIN: ${player.pin}`)
      console.log('')
    })

    console.log('============================================================')
    console.log('📱 INSTRUCCIONES DE USO:')
    console.log('• Comisión: Puede usar PIN o Admin Key para acceso completo')
    console.log('• Enfermos: Solo usar PIN para acceso de jugador')
    console.log('• Webpage: https://poker-b3m8dtm1w-juans-projects-e94adfd3.vercel.app')
    console.log('============================================================')

  } catch (error) {
    console.error('❌ Error al obtener los PINs:', error)
  } finally {
    await prisma.$disconnect()
  }
}

getAllPins()