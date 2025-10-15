import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const targetPin = '7368'

  console.log('🔍 Buscando Juan Antonio Cortez...\n')

  const player = await prisma.player.findFirst({
    where: {
      firstName: { contains: 'Juan Antonio' },
      lastName: { contains: 'Cortez' }
    }
  })

  if (!player) {
    console.log('❌ No se encontró el jugador')
    return
  }

  console.log('✅ Jugador encontrado:')
  console.log('   ID:', player.id)
  console.log('   Nombre:', player.firstName, player.lastName)
  console.log('   Rol:', player.role)
  console.log('   Activo:', player.isActive)
  console.log('   PIN actual en BD:', player.pin || 'SIN PIN')

  // Verificar si el PIN actual funciona
  if (player.pin) {
    const isValid = await bcrypt.compare(targetPin, player.pin)
    console.log('   ¿PIN 7368 válido?:', isValid ? '✅ SÍ' : '❌ NO')

    if (isValid) {
      console.log('\n✅ El PIN ya está correcto. No se necesitan cambios.')
      return
    }
  }

  // Hashear el nuevo PIN
  console.log('\n🔧 Actualizando PIN a 7368...')
  const hashedPin = await bcrypt.hash(targetPin, 10)

  const updated = await prisma.player.update({
    where: { id: player.id },
    data: { pin: hashedPin }
  })

  console.log('✅ PIN actualizado exitosamente!')

  // Verificar que el nuevo PIN funciona
  const verification = await bcrypt.compare(targetPin, updated.pin!)
  console.log('   Verificación:', verification ? '✅ PIN funciona correctamente' : '❌ ERROR en verificación')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
