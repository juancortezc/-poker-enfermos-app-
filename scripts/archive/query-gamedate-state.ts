import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function queryGameDateState() {
  console.log('🔍 Querying current GameDate records state across all tournaments...\n')

  try {
    // 1. Get all tournaments with their game dates
    const tournaments = await prisma.tournament.findMany({
      include: {
        gameDates: {
          orderBy: { dateNumber: 'asc' },
          include: {
            eliminations: {
              select: { id: true }
            },
            gameResults: {
              select: { id: true }
            },
            timerStates: {
              select: { 
                id: true, 
                status: true,
                currentLevel: true,
                timeRemaining: true 
              }
            }
          }
        }
      },
      orderBy: { number: 'asc' }
    })

    console.log(`🏆 Total tournaments found: ${tournaments.length}\n`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // 2. Display detailed information for each tournament
    for (const tournament of tournaments) {
      console.log(`🏆 TOURNAMENT ${tournament.number}: ${tournament.name}`)
      console.log(`   ID: ${tournament.id}`)
      console.log(`   Status: ${tournament.status}`)
      console.log(`   Created: ${tournament.createdAt.toISOString()}`)
      console.log(`   Updated: ${tournament.updatedAt.toISOString()}`)
      console.log(`   Participants: ${tournament.participantIds.length}`)
      console.log(`   Game Dates: ${tournament.gameDates.length}`)

      if (tournament.gameDates.length === 0) {
        console.log('   ⚠️  No game dates found for this tournament\n')
        continue
      }

      // 3. Show each game date in detail
      console.log('\n   📅 GAME DATES:')
      console.log('   ─────────────────────────────────────────────────────')
      
      tournament.gameDates.forEach(gameDate => {
        const statusEmoji = getStatusEmoji(gameDate.status)
        console.log(`   ${statusEmoji} Date ${gameDate.dateNumber} (ID: ${gameDate.id})`)
        console.log(`      Status: ${gameDate.status}`)
        console.log(`      Scheduled: ${gameDate.scheduledDate.toISOString().split('T')[0]}`)
        console.log(`      Start Time: ${gameDate.startTime?.toISOString() || 'Not started'}`)
        console.log(`      Players: ${gameDate.playerIds.length} (min: ${gameDate.playersMin}, max: ${gameDate.playersMax})`)
        console.log(`      Eliminations: ${gameDate.eliminations.length}`)
        console.log(`      Game Results: ${gameDate.gameResults.length}`)
        
        // Timer state info
        if (gameDate.timerStates.length > 0) {
          const timer = gameDate.timerStates[0]
          console.log(`      Timer: ${timer.status} (Level ${timer.currentLevel}, ${timer.timeRemaining}s remaining)`)
        } else {
          console.log(`      Timer: No timer state`)
        }
        
        // Flag inconsistencies
        const hasEliminations = gameDate.eliminations.length > 0
        const hasResults = gameDate.gameResults.length > 0
        const isCompleted = gameDate.status === 'completed'
        
        if ((hasEliminations || hasResults) && !isCompleted) {
          console.log(`      ⚠️  INCONSISTENCY: Has data but status is not 'completed'`)
        }
        
        if (isCompleted && !hasEliminations && !hasResults) {
          console.log(`      ⚠️  INCONSISTENCY: Marked as completed but no data`)
        }
        
        console.log('')
      })

      // 4. Status summary for this tournament
      const statusCounts = tournament.gameDates.reduce((acc, gd) => {
        acc[gd.status] = (acc[gd.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      console.log('   📊 STATUS SUMMARY:')
      Object.entries(statusCounts).forEach(([status, count]) => {
        const emoji = getStatusEmoji(status as any)
        console.log(`      ${emoji} ${status}: ${count}`)
      })

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    }

    // 5. Global summary across all tournaments
    console.log('🌍 GLOBAL SUMMARY ACROSS ALL TOURNAMENTS')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const allGameDates = tournaments.flatMap(t => t.gameDates)
    console.log(`📅 Total Game Dates: ${allGameDates.length}`)

    const globalStatusCounts = allGameDates.reduce((acc, gd) => {
      acc[gd.status] = (acc[gd.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('\n📊 Status Distribution:')
    Object.entries(globalStatusCounts).forEach(([status, count]) => {
      const emoji = getStatusEmoji(status as any)
      console.log(`   ${emoji} ${status}: ${count}`)
    })

    // 6. Find problematic dates (CREATED or in_progress)
    const createdDates = allGameDates.filter(gd => gd.status === 'CREATED')
    const inProgressDates = allGameDates.filter(gd => gd.status === 'in_progress')
    
    if (createdDates.length > 0) {
      console.log('\n🚨 DATES IN CREATED STATUS:')
      createdDates.forEach(gd => {
        const tournament = tournaments.find(t => t.id === gd.tournamentId)
        console.log(`   • Tournament ${tournament?.number}, Date ${gd.dateNumber} (ID: ${gd.id})`)
        console.log(`     Scheduled: ${gd.scheduledDate.toISOString().split('T')[0]}`)
        console.log(`     Players: ${gd.playerIds.length}, Eliminations: ${gd.eliminations.length}`)
      })
    }

    if (inProgressDates.length > 0) {
      console.log('\n⏳ DATES IN IN_PROGRESS STATUS:')
      inProgressDates.forEach(gd => {
        const tournament = tournaments.find(t => t.id === gd.tournamentId)
        console.log(`   • Tournament ${tournament?.number}, Date ${gd.dateNumber} (ID: ${gd.id})`)
        console.log(`     Scheduled: ${gd.scheduledDate.toISOString().split('T')[0]}`)
        console.log(`     Players: ${gd.playerIds.length}, Eliminations: ${gd.eliminations.length}`)
        console.log(`     Start Time: ${gd.startTime?.toISOString() || 'Not set'}`)
      })
    }

    // 7. Find inconsistent states
    const inconsistentDates = allGameDates.filter(gd => {
      const hasData = gd.eliminations.length > 0 || gd.gameResults.length > 0
      const isCompleted = gd.status === 'completed'
      return (hasData && !isCompleted) || (isCompleted && !hasData)
    })

    if (inconsistentDates.length > 0) {
      console.log('\n⚠️  INCONSISTENT DATES (have data but wrong status or vice versa):')
      inconsistentDates.forEach(gd => {
        const tournament = tournaments.find(t => t.id === gd.tournamentId)
        const hasEliminations = gd.eliminations.length > 0
        const hasResults = gd.gameResults.length > 0
        const isCompleted = gd.status === 'completed'
        
        console.log(`   • Tournament ${tournament?.number}, Date ${gd.dateNumber} (ID: ${gd.id})`)
        console.log(`     Status: ${gd.status}`)
        console.log(`     Eliminations: ${gd.eliminations.length}, Results: ${gd.gameResults.length}`)
        
        if ((hasEliminations || hasResults) && !isCompleted) {
          console.log(`     ❌ Has game data but status is not 'completed'`)
        }
        if (isCompleted && !hasEliminations && !hasResults) {
          console.log(`     ❌ Marked as completed but has no game data`)
        }
      })
    }

    // 8. Recent activity
    console.log('\n🕒 RECENT ACTIVITY (last 7 days):')
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const recentDates = allGameDates.filter(gd => 
      gd.scheduledDate >= oneWeekAgo || (gd.startTime && gd.startTime >= oneWeekAgo)
    )
    
    if (recentDates.length > 0) {
      recentDates.forEach(gd => {
        const tournament = tournaments.find(t => t.id === gd.tournamentId)
        console.log(`   • Tournament ${tournament?.number}, Date ${gd.dateNumber}: ${gd.status}`)
        console.log(`     Scheduled: ${gd.scheduledDate.toISOString().split('T')[0]}`)
        if (gd.startTime) {
          console.log(`     Started: ${gd.startTime.toISOString().split('T')[0]}`)
        }
      })
    } else {
      console.log('   No recent activity found')
    }

    console.log('\n✅ Query completed successfully!')

  } catch (error) {
    console.error('❌ Error querying database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'pending': return '⏸️'
    case 'CREATED': return '🆕'
    case 'in_progress': return '▶️'
    case 'completed': return '✅'
    case 'cancelled': return '❌'
    default: return '❓'
  }
}

// Run the script
queryGameDateState()