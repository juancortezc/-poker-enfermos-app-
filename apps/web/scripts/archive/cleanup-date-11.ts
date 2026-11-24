import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupDate11() {
  console.log('🧹 Starting cleanup of Date 11 test data...')
  
  try {
    // First, find the GameDate with dateNumber 11
    const gameDate11 = await prisma.gameDate.findFirst({
      where: {
        dateNumber: 11
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            number: true
          }
        },
        timerStates: true,
        eliminations: true,
        gameResults: true
      }
    })

    if (!gameDate11) {
      console.log('❌ No GameDate with dateNumber 11 found')
      return
    }

    console.log(`📋 Found GameDate 11 (ID: ${gameDate11.id}) in ${gameDate11.tournament.name}`)
    console.log(`📊 Current status: ${gameDate11.status}`)
    console.log(`👥 Player IDs: [${gameDate11.playerIds.join(', ')}]`)
    console.log(`⏱️ Timer states: ${gameDate11.timerStates.length}`)
    console.log(`💀 Eliminations: ${gameDate11.eliminations.length}`)
    console.log(`🎯 Game results: ${gameDate11.gameResults.length}`)

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      const cleanupSummary = {
        timerStatesDeleted: 0,
        eliminationsDeleted: 0,
        gameResultsDeleted: 0,
        gameDateUpdated: false
      }

      // 1. Delete TimerStates
      if (gameDate11.timerStates.length > 0) {
        // First delete TimerActions that reference the TimerState
        for (const timerState of gameDate11.timerStates) {
          const timerActionsDeleted = await tx.timerAction.deleteMany({
            where: { timerStateId: timerState.id }
          })
          console.log(`🗑️ Deleted ${timerActionsDeleted.count} timer actions for TimerState ${timerState.id}`)
        }

        const deletedTimerStates = await tx.timerState.deleteMany({
          where: { gameDateId: gameDate11.id }
        })
        cleanupSummary.timerStatesDeleted = deletedTimerStates.count
        console.log(`⏱️ Deleted ${deletedTimerStates.count} timer states`)
      }

      // 2. Delete Eliminations
      if (gameDate11.eliminations.length > 0) {
        const deletedEliminations = await tx.elimination.deleteMany({
          where: { gameDateId: gameDate11.id }
        })
        cleanupSummary.eliminationsDeleted = deletedEliminations.count
        console.log(`💀 Deleted ${deletedEliminations.count} eliminations`)
      }

      // 3. Delete GameResults
      if (gameDate11.gameResults.length > 0) {
        const deletedGameResults = await tx.gameResult.deleteMany({
          where: { gameDateId: gameDate11.id }
        })
        cleanupSummary.gameResultsDeleted = deletedGameResults.count
        console.log(`🎯 Deleted ${deletedGameResults.count} game results`)
      }

      // 4. Reset GameDate to clean state
      const updatedGameDate = await tx.gameDate.update({
        where: { id: gameDate11.id },
        data: {
          status: 'pending',
          playerIds: [],
          startTime: null,
          playersMin: 9,
          playersMax: 24
        }
      })
      cleanupSummary.gameDateUpdated = true
      console.log(`📅 Reset GameDate ${gameDate11.id} to clean state`)

      return cleanupSummary
    })

    // 5. Verify cleanup
    const verificationDate = await prisma.gameDate.findUnique({
      where: { id: gameDate11.id },
      include: {
        timerStates: true,
        eliminations: true,
        gameResults: true
      }
    })

    console.log('\n✅ CLEANUP COMPLETED SUCCESSFULLY!')
    console.log('📋 Cleanup Summary:')
    console.log(`   - Timer States Deleted: ${result.timerStatesDeleted}`)
    console.log(`   - Eliminations Deleted: ${result.eliminationsDeleted}`)
    console.log(`   - Game Results Deleted: ${result.gameResultsDeleted}`)
    console.log(`   - GameDate Updated: ${result.gameDateUpdated}`)

    console.log('\n🔍 Verification:')
    console.log(`   - Status: ${verificationDate?.status}`)
    console.log(`   - Player IDs: [${verificationDate?.playerIds.join(', ') || 'empty'}]`)
    console.log(`   - Start Time: ${verificationDate?.startTime || 'null'}`)
    console.log(`   - Timer States: ${verificationDate?.timerStates.length || 0}`)
    console.log(`   - Eliminations: ${verificationDate?.eliminations.length || 0}`)
    console.log(`   - Game Results: ${verificationDate?.gameResults.length || 0}`)

    console.log('\n🎉 Date 11 is now clean and ready for proper configuration!')

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanupDate11()
  .then(() => {
    console.log('\n✅ Date 11 cleanup completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Date 11 cleanup failed:', error)
    process.exit(1)
  })