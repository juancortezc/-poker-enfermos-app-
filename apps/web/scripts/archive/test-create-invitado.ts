import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCreateInvitado() {
  try {
    console.log('🔍 Buscando a Juan Tapia...')

    // Buscar Juan Tapia
    const juanTapia = await prisma.player.findFirst({
      where: {
        firstName: { contains: 'Juan', mode: 'insensitive' },
        lastName: { contains: 'Tapia', mode: 'insensitive' }
      }
    })

    if (!juanTapia) {
      console.log('❌ No se encontró a Juan Tapia')
      return
    }

    console.log('✅ Juan Tapia encontrado:', {
      id: juanTapia.id,
      nombre: `${juanTapia.firstName} ${juanTapia.lastName}`,
      role: juanTapia.role
    })

    // Verificar si Guido Andrade ya existe
    const existingGuido = await prisma.player.findFirst({
      where: {
        firstName: { contains: 'Guido', mode: 'insensitive' },
        lastName: { contains: 'Andrade', mode: 'insensitive' }
      }
    })

    if (existingGuido) {
      console.log('⚠️  Guido Andrade ya existe:', {
        id: existingGuido.id,
        nombre: `${existingGuido.firstName} ${existingGuido.lastName}`,
        role: existingGuido.role,
        inviterId: existingGuido.inviterId
      })
      console.log('\n🗑️  Eliminando registro existente...')
      await prisma.player.delete({
        where: { id: existingGuido.id }
      })
      console.log('✅ Registro eliminado')
    }

    // Intentar crear Guido Andrade
    console.log('\n📝 Creando Guido Andrade como invitado de Juan Tapia...')

    const newInvitado = await prisma.player.create({
      data: {
        firstName: 'Guido',
        lastName: 'Andrade',
        joinDate: new Date().getFullYear().toString(),
        joinYear: new Date().getFullYear(),
        role: 'Invitado',
        aliases: [],
        inviterId: juanTapia.id,
        photoUrl: 'https://storage.googleapis.com/poker-enfermos/pato.png',
        isActive: true
      },
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    console.log('✅ Invitado creado exitosamente:', {
      id: newInvitado.id,
      nombre: `${newInvitado.firstName} ${newInvitado.lastName}`,
      role: newInvitado.role,
      invitadoPor: `${newInvitado.inviter?.firstName} ${newInvitado.inviter?.lastName}`,
      joinYear: newInvitado.joinYear
    })

  } catch (error) {
    console.error('❌ Error:', error)
    if (error instanceof Error) {
      console.error('Mensaje:', error.message)
      console.error('Stack:', error.stack)
    }
  } finally {
    await prisma.$disconnect()
  }
}

testCreateInvitado()
