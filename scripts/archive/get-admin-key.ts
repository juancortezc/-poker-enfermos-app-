import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getAdminKey() {
  try {
    const comision = await prisma.player.findFirst({
      where: {
        role: 'Comision',
        adminKey: { not: null }
      },
      select: {
        firstName: true,
        lastName: true,
        adminKey: true
      }
    })

    if (comision) {
      console.log(`Admin: ${comision.firstName} ${comision.lastName}`)
      console.log(`Key: ${comision.adminKey}`)
    } else {
      console.log('No se encontró ningún usuario de Comisión con adminKey')
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

getAdminKey()
