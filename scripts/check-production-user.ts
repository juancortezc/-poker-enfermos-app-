import { prisma } from '../src/lib/prisma'
import bcrypt from 'bcryptjs'

async function checkProductionUser() {
  try {
    console.log('🔍 Verificando usuario Juan Antonio Cortez en producción...')
    
    // Buscar por nombre
    const userByName = await prisma.player.findFirst({
      where: {
        firstName: 'Juan Antonio',
        lastName: 'Cortez'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        pin: true,
        adminKey: true,
        isActive: true
      }
    })
    
    if (!userByName) {
      console.log('❌ Usuario Juan Antonio Cortez NO encontrado en producción')
      
      // Listar todos los usuarios de Comisión
      console.log('\n📋 Usuarios Comisión disponibles:')
      const comisionUsers = await prisma.player.findMany({
        where: { role: 'Comision' },
        select: {
          firstName: true,
          lastName: true,
          pin: true,
          adminKey: true,
          isActive: true
        }
      })
      
      comisionUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} - Activo: ${user.isActive}`)
      })
      
      return
    }
    
    console.log('✅ Usuario encontrado:')
    console.log(`   Nombre: ${userByName.firstName} ${userByName.lastName}`)
    console.log(`   Role: ${userByName.role}`)
    console.log(`   Activo: ${userByName.isActive}`)
    console.log(`   PIN: ${userByName.pin ? 'SÍ' : 'NO'}`)
    console.log(`   AdminKey: ${userByName.adminKey ? 'SÍ' : 'NO'}`)
    
    // Probar PIN 7368
    if (userByName.pin) {
      const isValid7368 = await bcrypt.compare('7368', userByName.pin)
      console.log(`\n🔐 PIN 7368 válido: ${isValid7368 ? '✅ SÍ' : '❌ NO'}`)
    }
    
    // Probar adminKey si existe
    if (userByName.adminKey) {
      console.log('🔑 AdminKey disponible como fallback')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProductionUser()