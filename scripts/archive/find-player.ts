import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findPlayer() {
  try {
    // Buscar jugadores con apellido "Toral"
    const players = await prisma.player.findMany({
      where: {
        OR: [
          { lastName: { contains: 'Toral', mode: 'insensitive' } },
          { lastName: { contains: 'toral', mode: 'insensitive' } },
          { firstName: { contains: 'Toral', mode: 'insensitive' } },
        ]
      }
    });

    if (players.length === 0) {
      console.log('No se encontraron jugadores con "Toral" en el nombre');

      // Listar todos los jugadores activos
      const allPlayers = await prisma.player.findMany({
        where: { isActive: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
      });

      console.log('\nJugadores activos:');
      allPlayers.forEach(p => {
        console.log(`- ${p.firstName} ${p.lastName} (ID: ${p.id})`);
      });
    } else {
      console.log('Jugadores encontrados:');
      players.forEach(p => {
        console.log(`\nID: ${p.id}`);
        console.log(`Nombre: ${p.firstName} ${p.lastName}`);
        console.log(`Role: ${p.role}`);
        console.log(`Activo: ${p.isActive}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findPlayer();
