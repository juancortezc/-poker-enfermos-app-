import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAuthAvailable() {
  try {
    console.log('🔑 Checking available authentication credentials...')

    // Check users with admin keys
    const usersWithAdminKey = await prisma.player.findMany({
      where: {
        adminKey: { not: null },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        adminKey: true
      }
    })

    console.log(`\n🔐 Users with admin keys: ${usersWithAdminKey.length}`)
    usersWithAdminKey.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.role}) - Has admin key: ${user.adminKey ? 'Yes' : 'No'}`)
    })

    // Check users with PINs
    const usersWithPin = await prisma.player.findMany({
      where: {
        pin: { not: null },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        pin: true
      }
    })

    console.log(`\n📱 Users with PINs: ${usersWithPin.length}`)
    usersWithPin.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.role}) - Has PIN: ${user.pin ? 'Yes' : 'No'}`)
    })

    // Check commission users specifically
    const commissionUsers = await prisma.player.findMany({
      where: {
        role: 'Comision',
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        adminKey: true,
        pin: true
      }
    })

    console.log(`\n👥 Commission users: ${commissionUsers.length}`)
    commissionUsers.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} - Admin Key: ${user.adminKey ? 'Yes' : 'No'}, PIN: ${user.pin ? 'Yes' : 'No'}`)
    })

    console.log('\n✅ Authentication check completed!')

  } catch (error) {
    console.error('❌ Auth check error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAuthAvailable()