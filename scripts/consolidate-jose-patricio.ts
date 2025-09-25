import { prisma } from '../src/lib/prisma'

async function consolidateJosePatricioProfiles() {
  const mainProfileId = 'cmfbl1aoz000zp8db4thegvmo'  // Profile with tournament history
  const duplicateProfileId = 'cmfvjlxva0000p8fm86fs09ml'  // Profile that won T23 but has no data

  console.log('🔄 Starting José Patricio Moreno profile consolidation...\n')

  try {
    // Step 1: Transfer T23 championship to main profile
    console.log('📋 Step 1: Transferring T23 championship...')
    const t23Update = await prisma.tournamentWinners.update({
      where: {
        tournamentNumber: 23
      },
      data: {
        championId: mainProfileId
      }
    })
    console.log('✅ T23 championship transferred to main profile\n')

    // Step 2: Check for any other database references to duplicate profile
    console.log('📋 Step 2: Checking for other database references...')
    
    // Check game results
    const gameResults = await prisma.gameResult.findMany({
      where: { playerId: duplicateProfileId }
    })
    console.log(`   Game Results: ${gameResults.length}`)

    // Check eliminations as eliminated player
    const eliminationsAsEliminated = await prisma.elimination.findMany({
      where: { eliminatedPlayerId: duplicateProfileId }
    })
    console.log(`   Eliminations (as eliminated): ${eliminationsAsEliminated.length}`)

    // Check eliminations as eliminator
    const eliminationsAsEliminator = await prisma.elimination.findMany({
      where: { eliminatorPlayerId: duplicateProfileId }
    })
    console.log(`   Eliminations (as eliminator): ${eliminationsAsEliminator.length}`)

    // Check tournament rankings
    const tournamentRankings = await prisma.tournamentRanking.findMany({
      where: { playerId: duplicateProfileId }
    })
    console.log(`   Tournament Rankings: ${tournamentRankings.length}`)

    // Check tournament participants
    const tournamentParticipants = await prisma.tournamentParticipant.findMany({
      where: { playerId: duplicateProfileId }
    })
    console.log(`   Tournament Participants: ${tournamentParticipants.length}`)

    // Check timer actions (using correct field name)
    const timerActions = await prisma.timerAction.findMany({
      where: { performedBy: duplicateProfileId }
    })
    console.log(`   Timer Actions: ${timerActions.length}`)

    // Check other tournament winner positions
    const otherWins = await prisma.tournamentWinners.findMany({
      where: {
        OR: [
          { runnerUpId: duplicateProfileId },
          { thirdPlaceId: duplicateProfileId },
          { sieteId: duplicateProfileId },
          { dosId: duplicateProfileId }
        ]
      }
    })
    console.log(`   Other tournament winner positions: ${otherWins.length}\n`)

    // Transfer any references before deletion
    console.log('📋 Step 3: Transferring remaining references...')
    
    // Transfer eliminations as eliminator
    if (eliminationsAsEliminator.length > 0) {
      console.log(`   Transferring ${eliminationsAsEliminator.length} elimination records...`)
      await prisma.elimination.updateMany({
        where: { eliminatorPlayerId: duplicateProfileId },
        data: { eliminatorPlayerId: mainProfileId }
      })
      console.log('   ✅ Elimination records transferred')
    }

    // Transfer any other references if they exist
    if (gameResults.length > 0) {
      await prisma.gameResult.updateMany({
        where: { playerId: duplicateProfileId },
        data: { playerId: mainProfileId }
      })
      console.log('   ✅ Game results transferred')
    }

    if (eliminationsAsEliminated.length > 0) {
      await prisma.elimination.updateMany({
        where: { eliminatedPlayerId: duplicateProfileId },
        data: { eliminatedPlayerId: mainProfileId }
      })
      console.log('   ✅ Eliminated player records transferred')
    }

    if (tournamentRankings.length > 0) {
      await prisma.tournamentRanking.updateMany({
        where: { playerId: duplicateProfileId },
        data: { playerId: mainProfileId }
      })
      console.log('   ✅ Tournament rankings transferred')
    }

    if (tournamentParticipants.length > 0) {
      await prisma.tournamentParticipant.updateMany({
        where: { playerId: duplicateProfileId },
        data: { playerId: mainProfileId }
      })
      console.log('   ✅ Tournament participants transferred')
    }

    // Update other tournament winner positions if needed
    if (otherWins.length > 0) {
      for (const win of otherWins) {
        const updateData: any = {}
        if (win.runnerUpId === duplicateProfileId) updateData.runnerUpId = mainProfileId
        if (win.thirdPlaceId === duplicateProfileId) updateData.thirdPlaceId = mainProfileId
        if (win.sieteId === duplicateProfileId) updateData.sieteId = mainProfileId
        if (win.dosId === duplicateProfileId) updateData.dosId = mainProfileId

        await prisma.tournamentWinners.update({
          where: { id: win.id },
          data: updateData
        })
      }
      console.log('   ✅ Other tournament positions transferred')
    }

    console.log('📋 Step 4: Deleting duplicate profile...')
    await prisma.player.delete({
      where: { id: duplicateProfileId }
    })
    console.log('✅ Duplicate profile deleted successfully\n')

    // Step 5: Verify the consolidation
    console.log('📋 Step 5: Verifying consolidation...')
    const finalProfile = await prisma.player.findUnique({
      where: { id: mainProfileId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        aliases: true,
        lastVictoryDate: true
      }
    })

    const t23Verification = await prisma.tournamentWinners.findUnique({
      where: { tournamentNumber: 23 },
      include: { champion: true }
    })

    console.log('Final profile:', finalProfile)
    console.log('T23 Champion:', t23Verification?.champion.firstName, t23Verification?.champion.lastName)
    
    console.log('\n🎉 CONSOLIDATION COMPLETED SUCCESSFULLY!')
    console.log('✅ José Patricio Moreno now has:')
    console.log('   - Tournament history and elimination data')
    console.log('   - T23 Championship win')
    console.log('   - Aliases: J&P, Asesor')
    console.log('   - PIN: 1984')
    console.log('   - Single unified profile')

  } catch (error) {
    console.error('❌ Error during consolidation:', error)
    throw error
  }
}

consolidateJosePatricioProfiles()
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })