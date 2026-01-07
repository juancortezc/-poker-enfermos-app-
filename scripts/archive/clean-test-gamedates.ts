import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanTestGameDates() {
  console.log('Starting cleanup of test GameDate records...')
  
  try {
    // Update GameDate records with IDs 61 and 62
    const updates = await prisma.gameDate.updateMany({
      where: {
        id: {
          in: [61, 62]
        }
      },
      data: {
        playerIds: [],
        status: 'pending',
        playersMin: 9
      }
    })
    
    console.log(`Successfully updated ${updates.count} GameDate records`)
    
    // Verify the updates
    const updatedRecords = await prisma.gameDate.findMany({
      where: {
        id: {
          in: [61, 62]
        }
      },
      select: {
        id: true,
        dateNumber: true,
        tournamentId: true,
        playerIds: true,
        status: true,
        playersMin: true,
        playersMax: true
      }
    })
    
    console.log('\nUpdated records:')
    updatedRecords.forEach(record => {
      console.log(`- GameDate ${record.id} (Date ${record.dateNumber} in Tournament ${record.tournamentId}):`)
      console.log(`  Status: ${record.status}`)
      console.log(`  Player IDs: [${record.playerIds.join(', ')}]`)
      console.log(`  Players Min: ${record.playersMin}`)
      console.log(`  Players Max: ${record.playersMax}`)
    })
    
  } catch (error) {
    console.error('Error cleaning test data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanTestGameDates()
  .then(() => {
    console.log('\nCleanup completed successfully!')
  })
  .catch((error) => {
    console.error('\nCleanup failed:', error)
    process.exit(1)
  })