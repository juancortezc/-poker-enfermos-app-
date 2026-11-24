import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// PINs conocidos de algunos jugadores (agregar más según sea necesario)
const KNOWN_PINS: Record<string, string> = {
  'Juan Antonio Cortez': '7368',
  // Agregar más jugadores aquí si conoces sus PINs
}

async function main() {
  console.log('🔍 Verificando PINs de todos los jugadores activos...\n')

  const players = await prisma.player.findMany({
    where: {
      isActive: true,
      pin: { not: null }
    },
    orderBy: [
      { role: 'asc' },
      { firstName: 'asc' }
    ]
  })

  console.log(`📊 Total jugadores con PIN: ${players.length}\n`)

  let validCount = 0
  let invalidCount = 0
  let unknownCount = 0

  for (const player of players) {
    const fullName = `${player.firstName} ${player.lastName}`
    const knownPin = KNOWN_PINS[fullName]

    if (!knownPin) {
      console.log(`⚪ ${fullName} (${player.role}) - PIN desconocido`)
      unknownCount++
      continue
    }

    const isValid = await bcrypt.compare(knownPin, player.pin!)

    if (isValid) {
      console.log(`✅ ${fullName} (${player.role}) - PIN ${knownPin} VÁLIDO`)
      validCount++
    } else {
      console.log(`❌ ${fullName} (${player.role}) - PIN ${knownPin} INVÁLIDO`)
      invalidCount++
    }
  }

  console.log('\n📊 RESUMEN:')
  console.log(`   ✅ Válidos: ${validCount}`)
  console.log(`   ❌ Inválidos: ${invalidCount}`)
  console.log(`   ⚪ Desconocidos: ${unknownCount}`)
  console.log(`   📝 Total: ${players.length}`)

  if (invalidCount > 0) {
    console.log('\n⚠️  Hay PINs inválidos. Ejecuta fix-juan-pin.ts o scripts similares para corregirlos.')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
