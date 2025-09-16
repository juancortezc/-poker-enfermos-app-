import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getReadablePins() {
  console.log('🔐 LISTA DE ACCESO - POKER DE ENFERMOS')
  console.log('💻 Web: https://poker-b3m8dtm1w-juans-projects-e94adfd3.vercel.app')
  console.log('============================================================\n')
  
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
        phone: true,
        email: true
      },
      orderBy: [
        { role: 'asc' }, // Comision first
        { firstName: 'asc' }
      ]
    })

    // Separate by role
    const comision = players.filter(p => p.role === 'Comision')
    const enfermos = players.filter(p => p.role === 'Enfermo')

    console.log('👑 COMISIÓN (Acceso Completo):')
    console.log('----------------------------------------')
    comision.forEach((player, index) => {
      console.log(`${index + 1}. ${player.firstName} ${player.lastName}`)
      console.log(`   📱 ${player.phone || 'Sin teléfono'}`)
      console.log(`   📧 ${player.email || 'Sin email'}`)
      console.log(`   🔑 ACCESO: PIN o Admin Key`)
      console.log('')
    })

    console.log('\n🎮 ENFERMOS (Acceso de Jugador):')
    console.log('----------------------------------------')
    enfermos.forEach((player, index) => {
      console.log(`${index + 1}. ${player.firstName} ${player.lastName}`)
      console.log(`   📱 ${player.phone || 'Sin teléfono'}`)
      console.log(`   📧 ${player.email || 'Sin email'}`)
      console.log(`   🔑 ACCESO: Solo PIN`)
      console.log('')
    })

    console.log('============================================================')
    console.log('📋 RESUMEN:')
    console.log(`• Comisión: ${comision.length} usuarios (acceso administrativo)`)
    console.log(`• Enfermos: ${enfermos.length} usuarios (acceso de jugador)`)
    console.log(`• Total: ${players.length} usuarios activos`)
    console.log('\n📱 NOTA IMPORTANTE:')
    console.log('• Los PINs están almacenados de forma segura en la base de datos')
    console.log('• Cada usuario debe usar su PIN personal para acceder')
    console.log('• La Comisión también puede usar Admin Keys para acceso completo')
    console.log('============================================================')

  } catch (error) {
    console.error('❌ Error al obtener datos:', error)
  } finally {
    await prisma.$disconnect()
  }
}

getReadablePins()