import { prisma } from '../src/lib/prisma'

async function analyzeTournament28() {
  console.log('=== Analyzing Tournament 28 ===\n')
  
  try {
    // 1. Get Tournament 28 data
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 },
      include: {
        tournamentParticipants: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true
              }
            }
          }
        },
        gameDates: {
          include: {
            eliminations: true,
            _count: {
              select: {
                eliminations: true
              }
            }
          },
          orderBy: { dateNumber: 'asc' }
        }
      }
    })

    if (!tournament) {
      console.error('Tournament 28 not found!')
      return
    }

    // 2. Analyze participant discrepancy
    console.log('PARTICIPANT ANALYSIS:')
    console.log(`- participantIds array length: ${tournament.participantIds.length}`)
    console.log(`- TournamentParticipant records: ${tournament.tournamentParticipants.length}`)
    
    if (tournament.participantIds.length !== tournament.tournamentParticipants.length) {
      console.log('\n⚠️  MISMATCH DETECTED!')
      
      // Find differences
      const participantTableIds = tournament.tournamentParticipants.map(tp => tp.playerId)
      const missingInTable = tournament.participantIds.filter(id => !participantTableIds.includes(id))
      const extraInTable = participantTableIds.filter(id => !tournament.participantIds.includes(id))
      
      if (missingInTable.length > 0) {
        console.log(`\nMissing in TournamentParticipant table (${missingInTable.length}):`)
        for (const playerId of missingInTable) {
          const player = await prisma.player.findUnique({
            where: { id: playerId },
            select: { firstName: true, lastName: true, role: true }
          })
          if (player) {
            console.log(`  - ${player.firstName} ${player.lastName} (${player.role}) - ID: ${playerId}`)
          } else {
            console.log(`  - Unknown player ID: ${playerId}`)
          }
        }
      }
      
      if (extraInTable.length > 0) {
        console.log(`\nExtra in TournamentParticipant table (${extraInTable.length}):`)
        const extras = tournament.tournamentParticipants.filter(tp => extraInTable.includes(tp.playerId))
        extras.forEach(tp => {
          console.log(`  - ${tp.player.firstName} ${tp.player.lastName} (${tp.player.role})`)
        })
      }
    } else {
      console.log('✅ Participant counts match')
    }

    // 3. Analyze game dates
    console.log('\n\nGAME DATES ANALYSIS:')
    console.log(`Total game dates: ${tournament.gameDates.length}`)
    
    const datesByStatus = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0
    }
    
    tournament.gameDates.forEach(gd => {
      datesByStatus[gd.status]++
    })
    
    console.log('Status breakdown:')
    Object.entries(datesByStatus).forEach(([status, count]) => {
      if (count > 0) {
        console.log(`  - ${status}: ${count}`)
      }
    })

    // 4. Analyze date formatting
    console.log('\n\nDATE FORMATTING ANALYSIS:')
    tournament.gameDates.slice(0, 3).forEach(gd => {
      const date = new Date(gd.scheduledDate)
      console.log(`\nDate ${gd.dateNumber}:`)
      console.log(`  - Raw from DB: ${gd.scheduledDate}`)
      console.log(`  - toISOString: ${date.toISOString()}`)
      console.log(`  - toLocaleDateString: ${date.toLocaleDateString('es-ES')}`)
      console.log(`  - Day of week: ${date.getDay()} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()]})`)
      console.log(`  - UTC Date: ${date.getUTCDate()}/${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`)
    })

    // 5. Analyze eliminations
    console.log('\n\nELIMINATIONS ANALYSIS:')
    let totalEliminations = 0
    let datesWithEliminations = 0
    
    tournament.gameDates.forEach(gd => {
      if (gd._count.eliminations > 0) {
        datesWithEliminations++
        totalEliminations += gd._count.eliminations
        console.log(`  - Date ${gd.dateNumber}: ${gd._count.eliminations} eliminations`)
      }
    })
    
    console.log(`\nTotal eliminations: ${totalEliminations}`)
    console.log(`Dates with eliminations: ${datesWithEliminations}`)
    console.log(`Dates without eliminations: ${tournament.gameDates.length - datesWithEliminations}`)

    // 6. Check for ranking issues
    console.log('\n\nRANKING PREREQUISITES:')
    const completedDates = tournament.gameDates.filter(gd => gd.status === 'completed')
    console.log(`- Completed dates: ${completedDates.length}`)
    console.log(`- Tournament participants: ${tournament.tournamentParticipants.length}`)
    
    if (completedDates.length === 0) {
      console.log('⚠️  No completed dates - rankings cannot be calculated!')
    } else if (tournament.tournamentParticipants.length === 0) {
      console.log('⚠️  No participants in TournamentParticipant table - rankings cannot be calculated!')
    } else {
      console.log('✅ Basic requirements for ranking calculation are met')
    }

    // 7. Summary
    console.log('\n\n=== SUMMARY OF ISSUES ===')
    const issues = []
    
    if (tournament.participantIds.length !== tournament.tournamentParticipants.length) {
      issues.push('Participant count mismatch between arrays')
    }
    if (completedDates.length === 0) {
      issues.push('No game dates marked as completed')
    }
    if (totalEliminations === 0) {
      issues.push('No elimination records found')
    }
    
    if (issues.length === 0) {
      console.log('✅ No major issues detected')
    } else {
      issues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue}`)
      })
    }

  } catch (error) {
    console.error('Error analyzing tournament:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the analysis
analyzeTournament28()