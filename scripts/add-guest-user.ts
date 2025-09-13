import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function addGuestUser() {
  try {
    console.log('🔍 Checking if guest user already exists...')
    
    // Verificar si ya existe un usuario Invitado con PIN 6666
    const existingGuest = await prisma.player.findFirst({
      where: {
        role: UserRole.Invitado,
        firstName: 'Invitado',
        lastName: 'Genérico'
      }
    })

    if (existingGuest) {
      console.log('👤 Guest user already exists:', existingGuest.firstName, existingGuest.lastName)
      
      // Verificar si tiene el PIN correcto
      const hasCorrectPin = existingGuest.pin && await bcrypt.compare('6666', existingGuest.pin)
      
      if (!hasCorrectPin) {
        console.log('🔐 Updating PIN to 6666...')
        const hashedPin = await bcrypt.hash('6666', 10)
        
        await prisma.player.update({
          where: { id: existingGuest.id },
          data: { pin: hashedPin }
        })
        
        console.log('✅ Guest user PIN updated successfully')
      } else {
        console.log('✅ Guest user already has correct PIN')
      }
      
      return
    }

    console.log('👤 Creating new guest user...')
    
    // Hash del PIN 6666
    const hashedPin = await bcrypt.hash('6666', 10)
    
    // Crear usuario Invitado genérico
    const guestUser = await prisma.player.create({
      data: {
        firstName: 'Invitado',
        lastName: 'Genérico',
        role: UserRole.Invitado,
        pin: hashedPin,
        joinDate: new Date().toISOString().split('T')[0], // Fecha actual
        isActive: true,
        aliases: ['Guest', 'Invitado'],
        joinYear: new Date().getFullYear(),
        email: 'invitado@pokerenfermos.com',
        phone: '0000000000'
      }
    })

    console.log('✅ Guest user created successfully:')
    console.log('   - ID:', guestUser.id)
    console.log('   - Name:', guestUser.firstName, guestUser.lastName)
    console.log('   - Role:', guestUser.role)
    console.log('   - PIN: 6666 (hashed)')
    console.log('   - Active:', guestUser.isActive)

    console.log('\n🎯 Guest user can now login with PIN: 6666')
    console.log('📱 This PIN provides access to: Home + LIVE (when active)')

  } catch (error) {
    console.error('❌ Error creating guest user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar script
addGuestUser()
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })