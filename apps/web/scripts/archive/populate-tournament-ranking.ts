import { prisma } from '../src/lib/prisma.js';
import { calculateTournamentRanking } from '../src/lib/ranking-utils.js';

async function populateTournamentRanking() {
  console.log('🏆 POBLANDO TABLA TOURNAMENT RANKING\n');
  console.log('='.repeat(70));

  try {
    // 1. Obtener Tournament 28
    const tournament = await prisma.tournament.findUnique({
      where: { number: 28 },
      include: {
        tournamentParticipants: {
          include: { player: true }
        }
      }
    });

    if (!tournament) {
      console.log('❌ Tournament 28 no encontrado');
      return;
    }

    console.log(`✅ Tournament 28 encontrado - ID: ${tournament.id}`);
    console.log(`📊 Participantes: ${tournament.tournamentParticipants.length}`);

    // 2. Obtener GameDates con eliminaciones
    const gameDates = await prisma.gameDate.findMany({
      where: {
        tournamentId: tournament.id,
        status: 'completed' // Solo fechas completadas
      },
      include: {
        eliminations: {
          include: {
            eliminatedPlayer: true
          }
        }
      },
      orderBy: { dateNumber: 'asc' }
    });

    console.log(`\n📅 Fechas completadas encontradas: ${gameDates.length}`);

    // 3. Limpiar TournamentRanking existente para este torneo
    const deletedRankings = await prisma.tournamentRanking.deleteMany({
      where: { tournamentId: tournament.id }
    });
    console.log(`🗑️ Eliminados ${deletedRankings.count} registros anteriores`);

    // 4. Calcular y poblar ranking para cada fecha
    let totalRecords = 0;

    for (const gameDate of gameDates) {
      console.log(`\n📅 Procesando Fecha ${gameDate.dateNumber}:`);
      
      if (gameDate.eliminations.length === 0) {
        console.log('  ⚠️ Sin eliminaciones, saltando...');
        continue;
      }

      // Calcular ranking hasta esta fecha usando la función existente
      const rankingData = await calculateTournamentRanking(tournament.id, gameDate.dateNumber);
      
      if (!rankingData || !rankingData.rankings) {
        console.log('  ❌ Error calculando ranking, saltando...');
        continue;
      }
      
      console.log(`  📊 Jugadores en ranking: ${rankingData.rankings.length}`);

      // Crear registros en TournamentRanking
      const rankingRecords = rankingData.rankings.map((player, index) => ({
        tournamentId: tournament.id,
        gameDateId: gameDate.id,
        playerId: player.playerId,
        rankingPosition: index + 1,
        accumulatedPoints: player.totalPoints,
        eliminationPositions: [] // Will be populated by the actual elimination positions
      }));

      // Insertar en batch
      const created = await prisma.tournamentRanking.createMany({
        data: rankingRecords
      });

      console.log(`  ✅ Creados ${created.count} registros de ranking`);
      totalRecords += created.count;

      // Mostrar top 3 de la fecha
      const top3 = rankingData.rankings.slice(0, 3);
      top3.forEach((player, idx) => {
        const playerData = tournament.tournamentParticipants.find(
          p => p.playerId === player.playerId
        )?.player;
        console.log(`  ${idx + 1}. ${playerData?.firstName} ${playerData?.lastName}: ${player.totalPoints} pts`);
      });
    }

    // 5. Verificar resultados
    console.log('\n🔍 VERIFICACIÓN FINAL:');
    const totalRankingRecords = await prisma.tournamentRanking.count({
      where: { tournamentId: tournament.id }
    });

    console.log(`📊 Total registros creados: ${totalRankingRecords}`);
    console.log(`📅 Fechas procesadas: ${gameDates.length}`);
    console.log(`👥 Participantes por fecha: ~${totalRankingRecords / gameDates.length}`);

    // 6. Mostrar ranking final
    console.log('\n🏆 RANKING FINAL (después de Fecha 8):');
    const finalRanking = await prisma.tournamentRanking.findMany({
      where: {
        tournamentId: tournament.id,
        gameDate: { dateNumber: 8 }
      },
      include: {
        player: true
      },
      orderBy: { rankingPosition: 'asc' },
      take: 10
    });

    finalRanking.forEach((record, idx) => {
      console.log(`${idx + 1}. ${record.player.firstName} ${record.player.lastName}: ${record.accumulatedPoints} pts`);
    });

    console.log('\n🎉 POBLACIÓN DE TOURNAMENT RANKING COMPLETADA');

  } catch (error) {
    console.error('💥 Error poblando TournamentRanking:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  populateTournamentRanking()
    .then(() => {
      console.log('\n✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}