import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findPlayer() {
  // Search for players with 'Benites' in last name or 'Mono' in first name/alias
  const players = await prisma.player.findMany({
    where: {
      OR: [
        { lastName: { contains: 'Benites', mode: 'insensitive' } },
        { lastName: { contains: 'Benitez', mode: 'insensitive' } },
        { firstName: { contains: 'Mono', mode: 'insensitive' } },
        { alias: { contains: 'Mono', mode: 'insensitive' } },
        { alias: { contains: 'Benites', mode: 'insensitive' } },
        { alias: { contains: 'Benitez', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      alias: true,
      pin: true,
      role: true,
      isActive: true,
      email: true,
      phone: true
    }
  });
  
  if (players.length > 0) {
    console.log('Found players:');
    players.forEach(p => {
      console.log(`\n- Name: ${p.firstName} ${p.lastName}`);
      console.log(`  Alias: ${p.alias || 'N/A'}`);
      console.log(`  PIN: ${p.pin || 'Not set'}`);
      console.log(`  Role: ${p.role}`);
      console.log(`  Active: ${p.isActive}`);
      console.log(`  Email: ${p.email || 'N/A'}`);
      console.log(`  Phone: ${p.phone || 'N/A'}`);
    });
  } else {
    console.log('No players found matching "Mono Benites" or similar variations');
  }
  
  // Also search for all players to see if there's a similar name
  console.log('\n\nSearching all players for similar names...');
  const allPlayers = await prisma.player.findMany({
    where: {
      isActive: true
    },
    select: {
      firstName: true,
      lastName: true,
      alias: true,
      pin: true
    },
    orderBy: {
      lastName: 'asc'
    }
  });
  
  console.log('\nActive players list:');
  allPlayers.forEach(p => {
    const pinStatus = p.pin ? 'PIN set' : 'NO PIN';
    console.log(`${p.firstName} ${p.lastName}${p.alias ? ` (${p.alias})` : ''} - ${pinStatus}`);
  });
  
  await prisma.$disconnect();
}

findPlayer().catch(console.error);