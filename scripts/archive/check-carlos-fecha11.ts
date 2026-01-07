import { prisma } from '../src/lib/prisma'

async function checkCarlosFecha11() {
  // Find Carlos Chacón
  const carlos = await prisma.player.findFirst({
    where: {
      OR: [
        { firstName: { contains: 'Carlos', mode: 'insensitive' } },
        { lastName: { contains: 'Chacón', mode: 'insensitive' } }
      ]
    }
  })

  if (!carlos) {
    console.log('Carlos Chacón not found')
    return
  }

  console.log(`\nFound: ${carlos.firstName} ${carlos.lastName} (ID: ${carlos.id})`)

  // Find Daniel Vela
  const daniel = await prisma.player.findFirst({
    where: {
      firstName: { contains: 'Daniel', mode: 'insensitive' },
      lastName: { contains: 'Vela', mode: 'insensitive' }
    }
  })

  if (!daniel) {
    console.log('Daniel Vela not found')
    return
  }

  console.log(`Daniel: ${daniel.firstName} ${daniel.lastName} (ID: ${daniel.id})`)

  // Get Fecha 11
  const fecha11 = await prisma.gameDate.findFirst({
    where: {
      tournamentId: 1,
      dateNumber: 11
    },
    include: {
      eliminations: {
        include: {
          eliminatedPlayer: true,
          eliminatorPlayer: true
        },
        orderBy: { position: 'asc' }
      }
    }
  })

  if (!fecha11) {
    console.log('Fecha 11 not found')
    return
  }

  console.log(`\n📅 Fecha #11 - Total eliminaciones: ${fecha11.eliminations.length}`)

  // Find Carlos' elimination
  const carlosElim = fecha11.eliminations.find(e => e.eliminatedPlayerId === carlos.id)

  if (!carlosElim) {
    console.log(`\n❌ Carlos Chacón NO tiene eliminación registrada en Fecha 11`)
    return
  }

  console.log(`\n✅ Eliminación de Carlos Chacón en Fecha 11:`)
  console.log(`   Posición: ${carlosElim.position}`)
  console.log(`   Puntos: ${carlosElim.points}`)
  console.log(`   Eliminado por: ${carlosElim.eliminatorPlayer ? `${carlosElim.eliminatorPlayer.firstName} ${carlosElim.eliminatorPlayer.lastName}` : 'SIN ELIMINADOR'}`)
  console.log(`   ID del eliminador: ${carlosElim.eliminatorPlayerId || 'NULL'}`)

  if (!carlosElim.eliminatorPlayerId) {
    console.log(`\n⚠️  PROBLEMA: Carlos fue eliminado pero NO tiene eliminador registrado`)
  } else if (carlosElim.eliminatorPlayerId !== daniel.id) {
    console.log(`\n⚠️  PROBLEMA: Carlos fue eliminado por ${carlosElim.eliminatorPlayer?.firstName} ${carlosElim.eliminatorPlayer?.lastName}, NO por Daniel Vela`)
    console.log(`   Según tus datos, Daniel debería ser el eliminador`)
  } else {
    console.log(`\n✅ Carlos fue correctamente eliminado por Daniel Vela`)
  }
}

checkCarlosFecha11()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
