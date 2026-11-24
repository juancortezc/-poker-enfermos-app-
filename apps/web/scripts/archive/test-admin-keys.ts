import { prisma } from '../src/lib/prisma.js';

async function testAdminKeys() {
  const players = await prisma.player.findMany({
    where: {
      adminKey: {
        not: null
      },
      role: 'Comision'
    },
    select: {
      firstName: true,
      lastName: true,
      adminKey: true,
      isActive: true
    }
  });

  console.log('Admin Keys disponibles:');
  players.forEach(player => {
    console.log(`${player.firstName} ${player.lastName}: ${player.adminKey} (activo: ${player.isActive})`);
  });

  await prisma.$disconnect();
}

testAdminKeys();