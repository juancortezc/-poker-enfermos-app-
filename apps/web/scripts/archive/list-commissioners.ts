import { prisma } from '../src/lib/prisma'

async function main() {
  const commissioners = await prisma.player.findMany({
    where: { role: 'Comision' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      pin: true,
    }
  })

  console.log('Commissioners:', commissioners)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
