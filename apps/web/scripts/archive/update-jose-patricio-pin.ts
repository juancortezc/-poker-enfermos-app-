import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

async function updateJosePatricioPIN() {
  const newPIN = '1984'
  const playerId = 'cmfbl1aoz000zp8db4thegvmo' // Jose Patricio Moreno (Enfermo)
  
  try {
    // Hash the PIN
    const hashedPIN = await bcrypt.hash(newPIN, 10)
    
    // Update the player's PIN
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: { pin: hashedPIN }
    })
    
    console.log('✅ Successfully updated PIN for Jose Patricio Moreno')
    console.log(`Player: ${updatedPlayer.firstName} ${updatedPlayer.lastName}`)
    console.log(`Role: ${updatedPlayer.role}`)
    console.log(`New PIN: ${newPIN} (hashed in database)`)
    
  } catch (error) {
    console.error('❌ Error updating PIN:', error)
    process.exit(1)
  }
}

updateJosePatricioPIN()
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })