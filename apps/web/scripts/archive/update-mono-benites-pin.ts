import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

async function updateMonoBenitesPIN() {
  const newPIN = '7272'
  const playerId = 'cmfbl19uq000fp8dbnvdeekj6'
  
  try {
    // Hash the PIN
    const hashedPIN = await bcrypt.hash(newPIN, 10)
    
    // Update the player's PIN
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: { pin: hashedPIN }
    })
    
    console.log('✅ Successfully updated PIN for Mono Benites')
    console.log(`Player: ${updatedPlayer.firstName} ${updatedPlayer.lastName}`)
    console.log(`New PIN: ${newPIN} (hashed in database)`)
    
  } catch (error) {
    console.error('❌ Error updating PIN:', error)
    process.exit(1)
  }
}

updateMonoBenitesPIN()
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })