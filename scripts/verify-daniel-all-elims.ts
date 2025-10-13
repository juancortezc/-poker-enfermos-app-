import { prisma } from '../src/lib/prisma'

async function verifyDanielAllElims() {
  // Find Daniel Vela
  const daniel = await prisma.player.findFirst({
    where: {
      OR: [
        { firstName: { contains: 'Daniel', mode: 'insensitive' } },
        { lastName: { contains: 'Vela', mode: 'insensitive' } }
      ]
    }
  })

  if (!daniel) {
    console.log('Daniel Vela not found')
    return
  }

  console.log(`\nFound: ${daniel.firstName} ${daniel.lastName} (ID: ${daniel.id})`)

  // Check ALL eliminations in T28 where eliminatorPlayer might be null
  const allGameDates = await prisma.gameDate.findMany({
    where: { tournamentId: 1 },
    include: {
      eliminations: {
        include: {
          eliminatedPlayer: true,
          eliminatorPlayer: true
        }
      }
    },
    orderBy: { dateNumber: 'asc' }
  })

  console.log(`\n📊 Buscando TODAS las eliminaciones donde Daniel pudo ser el eliminador:\n`)

  let totalCount = 0

  for (const gd of allGameDates) {
    const danielAsEliminator = gd.eliminations.filter(e => e.eliminatorPlayerId === daniel.id)

    if (danielAsEliminator.length > 0) {
      console.log(`\n📅 Fecha #${gd.dateNumber}:`)
      danielAsEliminator.forEach(elim => {
        totalCount++
        console.log(`  ${totalCount}. Eliminó a ${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`)
      })
    }
  }

  console.log(`\n\n✅ TOTAL: Daniel Vela tiene ${totalCount} eliminaciones registradas como ELIMINADOR`)
  console.log(`\nTú dices que debería tener: 3`)
  console.log(`\nDiferencia: ${3 - totalCount} eliminación${3 - totalCount !== 1 ? 'es' : ''} faltante${3 - totalCount !== 1 ? 's' : ''}`)

  if (totalCount < 3) {
    console.log(`\n⚠️  Posible problema: Puede haber eliminaciones donde Daniel es el eliminador pero no está registrado correctamente en la base de datos.`)
  }
}

verifyDanielAllElims()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
