import { prisma } from '../src/lib/prisma'

async function checkDanielGay() {
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

  // Get all eliminations where Daniel was the eliminator in Torneo 28
  const eliminations = await prisma.elimination.findMany({
    where: {
      eliminatorPlayerId: daniel.id,
      gameDate: {
        tournamentId: 1 // T28
      }
    },
    include: {
      eliminatedPlayer: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      gameDate: {
        select: {
          dateNumber: true
        }
      }
    },
    orderBy: {
      gameDate: {
        dateNumber: 'asc'
      }
    }
  })

  console.log(`\n🎯 DANIEL VELA - Eliminaciones como ELIMINADOR en T28:`)
  console.log(`Total: ${eliminations.length} eliminaciones\n`)

  eliminations.forEach(elim => {
    console.log(`  Fecha #${elim.gameDate.dateNumber}: Eliminó a ${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`)
  })

  // Now check all registered players and their elimination counts
  console.log(`\n\n📊 TODOS LOS JUGADORES REGISTRADOS EN T28 - Eliminaciones como ELIMINADOR:`)

  const tournament = await prisma.tournament.findUnique({
    where: { id: 1 },
    include: {
      tournamentParticipants: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }
    }
  })

  if (!tournament) return

  const registeredPlayerIds = tournament.tournamentParticipants.map(tp => tp.playerId)

  const eliminationCounts = new Map<string, { player: any; count: number }>()

  for (const tp of tournament.tournamentParticipants) {
    const playerId = tp.playerId
    const player = tp.player

    const elimCount = await prisma.elimination.count({
      where: {
        eliminatorPlayerId: playerId,
        gameDate: {
          tournamentId: 1
        }
      }
    })

    if (elimCount > 0) {
      eliminationCounts.set(playerId, {
        player,
        count: elimCount
      })
    }
  }

  // Sort by count ascending to find the "Gay del Torneo" (minimum eliminations)
  const sorted = Array.from(eliminationCounts.values()).sort((a, b) => a.count - b.count)

  console.log(`\nJugadores ordenados por eliminaciones (menor a mayor):\n`)
  sorted.forEach((entry, index) => {
    const marker = entry.player.id === daniel.id ? ' 👈 DANIEL' : ''
    console.log(`${index + 1}. ${entry.player.firstName} ${entry.player.lastName}: ${entry.count} eliminaciones${marker}`)
  })

  const minElims = sorted[0]?.count || 0
  const gayPlayers = sorted.filter(p => p.count === minElims)

  console.log(`\n\n🏳️‍🌈 GAY DEL TORNEO (mínimo ${minElims} eliminaciones):`)
  gayPlayers.forEach(p => {
    console.log(`  - ${p.player.firstName} ${p.player.lastName}: ${p.count} eliminaciones`)
  })
}

checkDanielGay()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
