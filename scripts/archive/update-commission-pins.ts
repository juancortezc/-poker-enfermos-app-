import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const updates = [
  { id: 'cmfbl19pd000bp8dbhwudzwur', pin: '1212' }, // Diego Behar
  { id: 'cmfbl1axu0013p8dbz8lt3c9u', pin: '1313' }, // Javier Martinez
  { id: 'cmfbl1abh000pp8dbtb7gbx1f', pin: '1414' }, // Juan Fernando Ochoa
  { id: 'cmfbl1b9r0019p8db1ii11dat', pin: '1515' }, // Meche Garrido
  { id: 'cmfbl1bg8001bp8db63ct0xsu', pin: '1616' }, // Jose Luis Toral
]

async function main() {
  for (const entry of updates) {
    const hashed = await bcrypt.hash(entry.pin, 10)
    await prisma.player.update({
      where: { id: entry.id },
      data: { pin: hashed }
    })
    console.log(`✅ Updated PIN for ${entry.id}`)
  }
}

main()
  .catch((err) => {
    console.error('Error updating pins:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
