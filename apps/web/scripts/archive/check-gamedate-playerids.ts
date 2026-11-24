import { prisma } from '../src/lib/prisma.js';

async function checkGameDatePlayerIds() {
  console.log('🔍 VERIFICANDO PLAYER_IDS EN GAME DATES\n');

  try {
    const gameDates = await prisma.gameDate.findMany({
      where: {
        tournament: { number: 28 }
      },
      include: {
        eliminations: {
          select: {
            eliminatedPlayerId: true,
            eliminatorPlayerId: true
          }
        }
      },
      orderBy: { dateNumber: 'asc' }
    });

    for (const gameDate of gameDates) {
      console.log(`📅 Fecha ${gameDate.dateNumber}:`);
      console.log(`  player_ids: ${JSON.stringify(gameDate.playerIds)}`);
      console.log(`  player_ids.length: ${gameDate.playerIds?.length || 0}`);
      console.log(`  eliminations count: ${gameDate.eliminations.length}`);
      
      if (gameDate.eliminations.length > 0) {
        const uniquePlayerIds = new Set();
        gameDate.eliminations.forEach(elim => {
          uniquePlayerIds.add(elim.eliminatedPlayerId);
          if (elim.eliminatorPlayerId && elim.eliminatorPlayerId !== elim.eliminatedPlayerId) {
            uniquePlayerIds.add(elim.eliminatorPlayerId);
          }
        });
        console.log(`  unique players in eliminations: ${uniquePlayerIds.size}`);
        console.log(`  players: [${Array.from(uniquePlayerIds).slice(0, 3).join(', ')}...]`);
      }
      console.log();
    }

  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGameDatePlayerIds();