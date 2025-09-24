import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

async function updateJorgeTamayoPIN() {
  const newPIN = '4567'
  const playerId = 'cmfbl19s2000dp8dbyogiettf'
  
  try {
    // Hash the PIN
    const hashedPIN = await bcrypt.hash(newPIN, 10)
    
    // Update the player's PIN
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: { pin: hashedPIN }
    })
    
    console.log('✅ Successfully updated PIN for Jorge Tamayo')
    console.log(`Player: ${updatedPlayer.firstName} ${updatedPlayer.lastName}`)
    console.log(`Aliases: ${updatedPlayer.aliases.join(', ')}`)
    console.log(`New PIN: ${newPIN} (hashed in database)`)
    
  } catch (error) {
    console.error('❌ Error updating PIN:', error)
    process.exit(1)
  }
}

updateJorgeTamayoPIN()
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })