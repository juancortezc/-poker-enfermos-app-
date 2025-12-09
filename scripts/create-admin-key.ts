import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdminKey() {
  try {
    // Get first Comision member
    const comision = await prisma.player.findFirst({
      where: {
        role: 'Comision'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        adminKey: true
      }
    })

    if (!comision) {
      console.log('❌ No se encontró ningún usuario de Comisión')
      return
    }

    console.log(`\n👤 Usuario: ${comision.firstName} ${comision.lastName}`)

    // Generate a simple adminKey
    const plainAdminKey = `test_admin_${Date.now()}`
    const hashedAdminKey = await bcrypt.hash(plainAdminKey, 10)

    // Update the user
    await prisma.player.update({
      where: { id: comision.id },
      data: { adminKey: hashedAdminKey }
    })

    console.log(`\n✅ AdminKey actualizado`)
    console.log(`\n🔑 Para usar en la UI, logeate con este token:`)
    console.log(`   ADMIN:${plainAdminKey}`)
    console.log(`\n🔑 Para usar en curl/scripts:`)
    console.log(`   Bearer ADMIN:${plainAdminKey}`)
    console.log(`\n📋 Ejemplo de curl:`)
    console.log(`   curl -H "Authorization: Bearer ADMIN:${plainAdminKey}" http://localhost:3002/api/players`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminKey()
