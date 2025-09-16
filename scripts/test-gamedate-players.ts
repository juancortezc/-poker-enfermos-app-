import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testGameDatePlayers() {
  console.log('🎯 Testing GameDate 12 Player Selection\n')
  
  try {
    // Get active tournament
    const activeTournament = await prisma.tournament.findFirst({
      where: { status: 'ACTIVO' },
      include: {
        gameDates: {
          where: {
            status: {
              notIn: ['completed', 'CREATED']
            }
          },
          orderBy: { dateNumber: 'asc' }
        },
        tournamentParticipants: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true
              }
            }
          }
        }
      }
    })

    if (!activeTournament) {
      console.log('❌ No active tournament found')
      return
    }

    console.log(`📋 Tournament: ${activeTournament.name}`)
    console.log(`📅 Available dates: ${activeTournament.gameDates.map(d => `Fecha ${d.dateNumber}`).join(', ')}\n`)

    // Get all active players
    const allActivePlayers = await prisma.player.findMany({
      where: {
        isActive: true,
        OR: [
          { role: 'Comision' },
          { role: 'Enfermo' }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      },
      orderBy: [
        { role: 'asc' },
        { firstName: 'asc' }
      ]
    })

    // Get all players who have participated in any game date
    const allGameDates = await prisma.gameDate.findMany({
      where: { tournamentId: activeTournament.id },
      select: { 
        playerIds: true,
        dateNumber: true,
        status: true
      }
    })
    
    const participatingPlayerIds = new Set<string>()
    allGameDates.forEach(gd => {
      gd.playerIds.forEach(id => participatingPlayerIds.add(id))
    })

    // Get tournament participants
    const tournamentParticipantIds = new Set(
      activeTournament.tournamentParticipants
        .filter(tp => tp.player.isActive)
        .map(tp => tp.player.id)
    )

    console.log('📊 Player Analysis:')
    console.log(`- Total active players: ${allActivePlayers.length}`)
    console.log(`- Tournament participants: ${tournamentParticipantIds.size}`)
    console.log(`- Players who have participated in any date: ${participatingPlayerIds.size}`)

    // Find players not in tournament participants
    const nonParticipants = allActivePlayers.filter(p => !tournamentParticipantIds.has(p.id))
    console.log(`\n⚠️  Players NOT registered in tournament (${nonParticipants.length}):`)
    nonParticipants.forEach(p => {
      const hasPlayed = participatingPlayerIds.has(p.id)
      console.log(`  - ${p.firstName} ${p.lastName} (${p.role}) ${hasPlayed ? '✅ Has played in dates' : '❌ Never played'}`)
    })

    // Show which players would be pre-selected
    const preselectPlayers = allActivePlayers.filter(p => 
      tournamentParticipantIds.has(p.id) || participatingPlayerIds.has(p.id)
    )
    console.log(`\n✅ Players that should be pre-selected for GameDate 12: ${preselectPlayers.length}`)

    // Show final result
    console.log('\n🎯 RESULT:')
    console.log(`All ${allActivePlayers.length} active players will be shown in the selection`)
    console.log(`${preselectPlayers.length} players will be pre-selected based on tournament participation or previous game dates`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testGameDatePlayers()