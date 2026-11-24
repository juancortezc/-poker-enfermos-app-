import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAndFixT29F7() {
  try {
    console.log('🔍 VERIFICACIÓN: Torneo 29 - Fecha 7');
    console.log('='.repeat(60));

    // 1. Buscar la fecha 7 del Torneo 29
    const gameDate = await prisma.gameDate.findFirst({
      where: {
        tournament: { number: 29 },
        dateNumber: 7
      },
      include: { tournament: true }
    });

    if (!gameDate) {
      console.error('❌ No se encontró la fecha 7 del Torneo 29');
      return;
    }

    console.log(`\n📅 Fecha: ${gameDate.tournament.name} - Fecha ${gameDate.dateNumber}`);
    console.log(`   ID: ${gameDate.id}`);
    console.log(`   Jugadores: ${gameDate.playerIds.length}`);

    // 2. Buscar a Jorge Tamayo
    const jorgeTamayo = await prisma.player.findFirst({
      where: {
        firstName: { contains: 'Jorge', mode: 'insensitive' },
        lastName: { contains: 'Tamayo', mode: 'insensitive' }
      }
    });

    // Verificar si Jorge Tamayo está en la fecha
    const tamayoInDate = gameDate.playerIds.includes(jorgeTamayo?.id || '');
    console.log(`\n👤 Jorge Tamayo en playerIds: ${tamayoInDate ? '⚠️ SÍ (problema)' : '✅ NO (correcto)'}`);

    // 3. Verificar eliminaciones
    const eliminations = await prisma.elimination.findMany({
      where: { gameDateId: gameDate.id },
      include: {
        eliminatedPlayer: true,
        eliminatorPlayer: true
      },
      orderBy: { position: 'desc' }
    });

    console.log(`\n📊 Eliminaciones registradas: ${eliminations.length}`);
    console.log('-'.repeat(60));
    eliminations.forEach(e => {
      const isTamayo = e.eliminatedPlayerId === jorgeTamayo?.id;
      console.log(`   Pos ${e.position}: ${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName} -> ${e.points} pts${isTamayo ? ' ⚠️' : ''}`);
    });

    // 4. Verificar GameResults
    const gameResults = await prisma.gameResult.findMany({
      where: { gameDateId: gameDate.id },
      include: { player: true },
      orderBy: { points: 'desc' }
    });

    console.log(`\n📈 GameResults registrados: ${gameResults.length}`);

    // 5. Verificar TournamentRankings para esta fecha
    const rankings = await prisma.tournamentRanking.findMany({
      where: {
        tournamentId: gameDate.tournamentId,
        gameDateId: gameDate.id
      },
      include: { player: true },
      orderBy: { accumulatedPoints: 'desc' }
    });

    console.log(`\n🏆 TournamentRankings para esta fecha: ${rankings.length}`);

    // Verificar si Tamayo tiene ranking en esta fecha
    const tamayoRanking = rankings.find(r => r.playerId === jorgeTamayo?.id);
    if (tamayoRanking) {
      console.log(`⚠️ Jorge Tamayo tiene ranking para esta fecha - eliminando...`);

      await prisma.tournamentRanking.delete({
        where: { id: tamayoRanking.id }
      });
      console.log('✅ Ranking de Jorge Tamayo eliminado');
    }

    // 6. Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN:');
    console.log(`   - Jugadores en fecha: ${gameDate.playerIds.length}`);
    console.log(`   - Eliminaciones: ${eliminations.length}`);
    console.log(`   - Jorge Tamayo en lista: ${tamayoInDate ? '⚠️ SÍ' : '✅ NO'}`);
    console.log(`   - Eliminación de Tamayo: ${eliminations.some(e => e.eliminatedPlayerId === jorgeTamayo?.id) ? '⚠️ SÍ' : '✅ NO'}`);

    // Verificar que todos los puntos están correctos para 17 jugadores
    const expectedPoints = [17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    let pointsCorrect = true;
    eliminations.forEach((e, i) => {
      if (e.points !== expectedPoints[i]) {
        pointsCorrect = false;
        console.log(`   ⚠️ Posición ${e.position} tiene ${e.points} pts, debería ser ${expectedPoints[i]} pts`);
      }
    });

    if (pointsCorrect) {
      console.log('   - Puntos: ✅ Todos correctos para 17 jugadores');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAndFixT29F7();
