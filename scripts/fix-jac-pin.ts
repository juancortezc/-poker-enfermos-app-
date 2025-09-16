import { prisma } from '../src/lib/prisma'
import bcrypt from 'bcryptjs'

async function fixJacPin() {
  try {
    console.log('🔧 Actualizando PIN para Juan Antonio Cortez...')
    
    // Buscar el usuario
    const user = await prisma.player.findFirst({
      where: {
        firstName: 'Juan Antonio',
        lastName: 'Cortez'
      }
    })
    
    if (!user) {
      console.log('❌ Usuario no encontrado')
      return
    }
    
    console.log(`✅ Usuario encontrado: ${user.firstName} ${user.lastName}`)
    
    // Generar nuevo hash para PIN 7368
    const newPinHash = await bcrypt.hash('7368', 12)
    
    // Actualizar en base de datos
    const updatedUser = await prisma.player.update({
      where: { id: user.id },
      data: { pin: newPinHash }
    })
    
    console.log('🔐 PIN actualizado exitosamente')
    
    // Verificar que funcione
    const isValid = await bcrypt.compare('7368', newPinHash)
    console.log(`✅ Verificación: PIN 7368 ${isValid ? 'VÁLIDO' : 'INVÁLIDO'}`)
    
    // Probar autenticación completa
    console.log('\n🧪 Probando autenticación...')
    const testPin = '7368'
    
    // Simular el flujo de autenticación
    const allUsers = await prisma.player.findMany({
      where: {
        isActive: true,
        pin: { not: null }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        pin: true,
      }
    })
    
    for (const player of allUsers) {
      if (player.pin && await bcrypt.compare(testPin, player.pin)) {
        console.log(`🎉 ¡Autenticación exitosa para ${player.firstName} ${player.lastName}!`)
        break
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixJacPin()