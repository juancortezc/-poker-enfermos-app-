import { prisma } from '../src/lib/prisma'

async function verifyMiltonOnlyLast() {
  // Find Milton
  const milton = await prisma.player.findFirst({
    where: {
      OR: [
        { firstName: { contains: 'Milton', mode: 'insensitive' } },
        { lastName: { contains: 'Milton', mode: 'insensitive' } }
      ]
    }
  })

  if (!milton) {
    console.log('Milton not found')
    return
  }

  console.log(`\nFound: ${milton.firstName} ${milton.lastName} (ID: ${milton.id})`)

  // Get all game dates for Torneo 28
  const gameDates = await prisma.gameDate.findMany({
    where: { tournamentId: 1 }, // T28
    orderBy: { dateNumber: 'asc' },
    include: {
      eliminations: {
        include: {
          eliminatedPlayer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { position: 'desc' }
      }
    }
  })

  console.log(`\nTorneo 28 - Total game dates: ${gameDates.length}`)

  let ultimos = 0

  for (const gd of gameDates) {
    // Find Milton's elimination in this date
    const miltonElim = gd.eliminations.find(e => e.eliminatedPlayerId === milton.id)

    if (!miltonElim) {
      console.log(`\n📅 Fecha #${gd.dateNumber}: Milton no jugó (falta)`)
      continue
    }

    const totalPlayers = gd.eliminations.length
    const lastPosition = totalPlayers

    // NEW LOGIC: Check if Milton is in ONLY last position (not second to last)
    const isLastPlace = miltonElim.position === lastPosition

    if (isLastPlace) {
      ultimos++
      console.log(`\n📅 Fecha #${gd.dateNumber}: ✅ ÚLTIMO LUGAR (posición #${miltonElim.position}/${totalPlayers})`)
    } else {
      console.log(`\n📅 Fecha #${gd.dateNumber}: No es último lugar (posición #${miltonElim.position}/${totalPlayers})`)
    }

    console.log(`   Points: ${miltonElim.points}`)
  }

  console.log(`\n\n🎯 RESULTADO CONTANDO SOLO ÚLTIMO LUGAR:`)
  console.log(`Milton terminó en último lugar: ${ultimos} veces`)
  console.log(`✅ Debería ser: 3`)
}

verifyMiltonOnlyLast()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
