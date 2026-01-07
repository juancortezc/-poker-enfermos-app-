import { prisma } from '../src/lib/prisma'

async function checkMiltonUltimos() {
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

    // Rank by points DESC
    const rankedByPoints = [...gd.eliminations].sort((a, b) => b.points - a.points)
    const miltonRank = rankedByPoints.findIndex(e => e.eliminatedPlayerId === milton.id) + 1
    const totalPlayers = gd.eliminations.length

    // Last two = bottom two by points
    const lastTwo = rankedByPoints.slice(-2)
    const isInLastTwo = lastTwo.some(e => e.eliminatedPlayerId === milton.id)

    if (isInLastTwo) {
      ultimos++
      console.log(`\n📅 Fecha #${gd.dateNumber}: ✅ ÚLTIMO`)
    } else {
      console.log(`\n📅 Fecha #${gd.dateNumber}: No es último`)
    }

    console.log(`   Position by elimination order: #${miltonElim.position}`)
    console.log(`   Rank by points: #${miltonRank}/${totalPlayers}`)
    console.log(`   Points: ${miltonElim.points}`)
    console.log(`   Last two by points:`)
    lastTwo.forEach((e, i) => {
      const rank = rankedByPoints.findIndex(x => x.id === e.id) + 1
      console.log(`     ${i + 1}. ${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName} - Rank #${rank} - ${e.points} pts`)
    })
  }

  console.log(`\n\n🎯 RESULTADO FINAL:`)
  console.log(`Milton aparece en últimos lugares: ${ultimos} veces`)
  console.log(`Debería ser: 3 (según tu validación)`)
}

checkMiltonUltimos()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
