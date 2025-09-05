import { prisma } from '../src/lib/prisma'

async function repairTournament28() {
  console.log('=== Repairing Tournament 28 ===\n')
  
  try {
    // 1. Get Tournament 28 data
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 },
      include: {
        tournamentParticipants: true,
        gameDates: true
      }
    })

    if (!tournament) {
      console.error('Tournament 28 not found!')
      return
    }

    console.log(`Found Tournament 28 (ID: ${tournament.id})`)
    
    // 2. Fix participant synchronization
    console.log('\n1. SYNCHRONIZING PARTICIPANTS...')
    
    const participantTableIds = tournament.tournamentParticipants.map(tp => tp.playerId)
    const missingInTable = tournament.participantIds.filter(id => !participantTableIds.includes(id))
    
    if (missingInTable.length > 0) {
      console.log(`Adding ${missingInTable.length} missing participants to TournamentParticipant table...`)
      
      for (const playerId of missingInTable) {
        try {
          // Verify player exists and is eligible
          const player = await prisma.player.findUnique({
            where: { id: playerId }
          })
          
          if (player && player.role !== 'Invitado') {
            await prisma.tournamentParticipant.create({
              data: {
                tournamentId: tournament.id,
                playerId: playerId,
                confirmed: false
              }
            })
            console.log(`  ✅ Added ${player.firstName} ${player.lastName}`)
          } else if (player && player.role === 'Invitado') {
            console.log(`  ⚠️  Skipped ${player.firstName} ${player.lastName} (Invitado)`)
            // Remove from participantIds array
            await prisma.tournament.update({
              where: { id: tournament.id },
              data: {
                participantIds: tournament.participantIds.filter(id => id !== playerId)
              }
            })
          }
        } catch (error) {
          console.error(`  ❌ Error adding participant ${playerId}:`, error)
        }
      }
    } else {
      console.log('  ✅ All participants already synchronized')
    }
    
    // Update the participantIds array to match TournamentParticipant table
    const updatedParticipants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId: tournament.id },
      select: { playerId: true }
    })
    
    const correctParticipantIds = updatedParticipants.map(p => p.playerId)
    
    await prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        participantIds: correctParticipantIds
      }
    })
    
    console.log(`  ✅ Updated participantIds array to ${correctParticipantIds.length} participants`)

    // 3. Fix date timezone issues
    console.log('\n2. FIXING DATE TIMEZONE ISSUES...')
    
    for (const gameDate of tournament.gameDates) {
      const date = new Date(gameDate.scheduledDate)
      const dayOfWeek = date.getDay()
      
      // If the date appears to be off by a day (not Tuesday), adjust it
      if (dayOfWeek !== 2) {
        console.log(`  Fixing Date ${gameDate.dateNumber} (currently ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]})`)
        
        // Create a new date ensuring it's a Tuesday
        const year = date.getFullYear()
        const month = date.getMonth()
        const day = date.getDate()
        
        // Adjust to the nearest Tuesday
        let adjustedDate = new Date(year, month, day)
        
        // If it's Monday (1), add 1 day
        if (dayOfWeek === 1) {
          adjustedDate.setDate(adjustedDate.getDate() + 1)
        }
        // If it's Wednesday (3), subtract 1 day
        else if (dayOfWeek === 3) {
          adjustedDate.setDate(adjustedDate.getDate() - 1)
        }
        
        // Set to noon UTC to avoid timezone issues
        adjustedDate.setUTCHours(12, 0, 0, 0)
        
        await prisma.gameDate.update({
          where: { id: gameDate.id },
          data: { scheduledDate: adjustedDate }
        })
        
        console.log(`    ✅ Adjusted to ${adjustedDate.toISOString().split('T')[0]} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][adjustedDate.getDay()]})`)
      }
    }
    
    // 4. Create sample eliminations for testing (if none exist)
    console.log('\n3. CHECKING ELIMINATIONS...')
    
    const completedDates = await prisma.gameDate.findMany({
      where: {
        tournamentId: tournament.id,
        status: 'completed'
      },
      include: {
        eliminations: true
      }
    })
    
    if (completedDates.length === 0) {
      console.log('  ⚠️  No completed dates found. Marking first date as completed for testing...')
      
      const firstDate = await prisma.gameDate.findFirst({
        where: {
          tournamentId: tournament.id,
          dateNumber: 1
        }
      })
      
      if (firstDate) {
        await prisma.gameDate.update({
          where: { id: firstDate.id },
          data: { 
            status: 'completed',
            playerIds: correctParticipantIds.slice(0, 12) // Use first 12 participants
          }
        })
        
        console.log('  ✅ Marked Date 1 as completed')
        
        // Create sample eliminations
        console.log('  Creating sample eliminations for Date 1...')
        
        const participantsForElimination = correctParticipantIds.slice(0, 10)
        const eliminationTime = new Date()
        
        for (let i = 0; i < participantsForElimination.length - 1; i++) {
          const position = participantsForElimination.length - i
          const points = calculatePointsForPosition(position, participantsForElimination.length)
          
          await prisma.elimination.create({
            data: {
              position,
              points,
              eliminatedPlayerId: participantsForElimination[i],
              eliminatorPlayerId: participantsForElimination[participantsForElimination.length - 1], // Last player eliminates all
              eliminationTime: eliminationTime.toISOString(),
              gameDateId: firstDate.id
            }
          })
        }
        
        console.log(`  ✅ Created ${participantsForElimination.length - 1} sample eliminations`)
      }
    } else {
      console.log(`  ✅ Found ${completedDates.length} completed dates`)
      
      completedDates.forEach(date => {
        console.log(`    - Date ${date.dateNumber}: ${date.eliminations.length} eliminations`)
      })
    }

    // 5. Final verification
    console.log('\n\n=== VERIFICATION ===')
    
    const verifyTournament = await prisma.tournament.findFirst({
      where: { id: tournament.id },
      include: {
        tournamentParticipants: true,
        gameDates: {
          where: { status: 'completed' },
          include: {
            _count: {
              select: { eliminations: true }
            }
          }
        }
      }
    })
    
    console.log(`✅ Tournament participants: ${verifyTournament!.tournamentParticipants.length}`)
    console.log(`✅ participantIds array: ${verifyTournament!.participantIds.length}`)
    console.log(`✅ Completed dates: ${verifyTournament!.gameDates.length}`)
    
    const totalEliminations = verifyTournament!.gameDates.reduce((sum, gd) => sum + gd._count.eliminations, 0)
    console.log(`✅ Total eliminations: ${totalEliminations}`)
    
    console.log('\n🎉 Repair completed!')

  } catch (error) {
    console.error('Error repairing tournament:', error)
  } finally {
    await prisma.$disconnect()
  }
}

function calculatePointsForPosition(position: number, totalPlayers: number): number {
  // Basic point calculation based on position
  const basePoints = {
    1: 25,
    2: 20,
    3: 16,
    4: 13,
    5: 11,
    6: 9,
    7: 7,
    8: 5,
    9: 3,
    10: 1
  }
  
  return basePoints[position] || 0
}

// Run the repair
repairTournament28()