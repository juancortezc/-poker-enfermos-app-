import { prisma } from '../src/lib/prisma.js';

async function diagnoseDatabaseState() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DE BASE DE DATOS - TORNEO 28\n');
  console.log('='.repeat(80));

  try {
    // 1. Verificar Tournament 28
    const tournament28 = await prisma.tournament.findUnique({
      where: { number: 28 },
      include: {
        tournamentParticipants: {
          include: {
            player: true
          }
        }
      }
    });

    console.log('\n📋 TORNEO 28:');
    if (tournament28) {
      console.log(`✅ Encontrado - ID: ${tournament28.id}, Status: ${tournament28.status}`);
      console.log(`📊 Participantes: ${tournament28.tournamentParticipants.length}`);
    } else {
      console.log('❌ Torneo 28 no encontrado');
      return;
    }

    // 2. Verificar GameDates del Torneo 28
    const gameDates = await prisma.gameDate.findMany({
      where: {
        tournament: { number: 28 }
      },
      orderBy: { dateNumber: 'asc' }
    });

    console.log('\n📅 GAME DATES:');
    console.log(`📊 Total fechas encontradas: ${gameDates.length}`);
    
    for (const gameDate of gameDates) {
      const eliminationCount = await prisma.elimination.count({
        where: { gameDateId: gameDate.id }
      });
      
      console.log(`  Fecha ${gameDate.dateNumber}: ID ${gameDate.id}, Status: ${gameDate.status}, Eliminaciones: ${eliminationCount}`);
    }

    // 3. Verificar Eliminaciones por fecha
    console.log('\n🎯 ELIMINACIONES POR FECHA:');
    for (let dateNum = 1; dateNum <= 8; dateNum++) {
      const gameDate = gameDates.find(gd => gd.dateNumber === dateNum);
      if (!gameDate) {
        console.log(`  Fecha ${dateNum}: ❌ GameDate no encontrada`);
        continue;
      }

      const eliminations = await prisma.elimination.findMany({
        where: { gameDateId: gameDate.id },
        include: {
          eliminatedPlayer: true,
          eliminatorPlayer: true
        },
        orderBy: { position: 'desc' }
      });

      console.log(`  Fecha ${dateNum}: ${eliminations.length} eliminaciones`);
      
      if (eliminations.length > 0) {
        const winner = eliminations.find(e => e.position === 1);
        const lastPosition = eliminations.find(e => e.position === eliminations.length);
        
        console.log(`    🥇 Ganador: ${winner?.eliminatedPlayer.firstName} ${winner?.eliminatedPlayer.lastName} (${winner?.points} pts)`);
        console.log(`    📉 Último: Pos ${lastPosition?.position} (${lastPosition?.points} pts)`);
      }
    }

    // 4. Verificar TournamentRanking
    console.log('\n🏆 TOURNAMENT RANKING:');
    const rankings = await prisma.tournamentRanking.findMany({
      where: {
        tournament: { number: 28 }
      },
      include: {
        player: true
      },
      orderBy: [
        { dateNumber: 'asc' },
        { totalPoints: 'desc' }
      ]
    });

    console.log(`📊 Total registros en TournamentRanking: ${rankings.length}`);
    
    // Agrupar por fecha
    const rankingsByDate: Record<number, any[]> = {};
    rankings.forEach(ranking => {
      if (!rankingsByDate[ranking.dateNumber]) {
        rankingsByDate[ranking.dateNumber] = [];
      }
      rankingsByDate[ranking.dateNumber].push(ranking);
    });

    for (let dateNum = 1; dateNum <= 8; dateNum++) {
      const dateRankings = rankingsByDate[dateNum] || [];
      console.log(`  Fecha ${dateNum}: ${dateRankings.length} registros`);
      
      if (dateRankings.length > 0) {
        const topPlayer = dateRankings[0];
        console.log(`    🔝 Top: ${topPlayer.player.firstName} ${topPlayer.player.lastName} (${topPlayer.totalPoints} pts)`);
      }
    }

    // 5. Resumen de problemas encontrados
    console.log('\n🚨 PROBLEMAS DETECTADOS:');
    const problems: string[] = [];

    // Verificar fechas faltantes
    const expectedDates = [1, 2, 3, 4, 5, 6, 7, 8];
    const existingDates = gameDates.map(gd => gd.dateNumber);
    const missingDates = expectedDates.filter(d => !existingDates.includes(d));
    
    if (missingDates.length > 0) {
      problems.push(`❌ GameDates faltantes: ${missingDates.join(', ')}`);
    }

    // Verificar eliminaciones faltantes
    for (const gameDate of gameDates) {
      const elimCount = await prisma.elimination.count({
        where: { gameDateId: gameDate.id }
      });
      if (elimCount === 0) {
        problems.push(`❌ Fecha ${gameDate.dateNumber}: Sin eliminaciones`);
      }
    }

    // Verificar TournamentRanking faltante
    const datesWithRankings = Object.keys(rankingsByDate).map(d => parseInt(d));
    const datesWithoutRankings = existingDates.filter(d => !datesWithRankings.includes(d));
    
    if (datesWithoutRankings.length > 0) {
      problems.push(`❌ TournamentRanking faltante para fechas: ${datesWithoutRankings.join(', ')}`);
    }

    if (problems.length === 0) {
      console.log('✅ No se encontraron problemas críticos');
    } else {
      problems.forEach(problem => console.log(`  ${problem}`));
    }

    // 6. Estadísticas finales
    console.log('\n📈 ESTADÍSTICAS FINALES:');
    const totalEliminations = await prisma.elimination.count({
      where: {
        gameDate: {
          tournament: { number: 28 }
        }
      }
    });
    
    const totalRankingRecords = rankings.length;
    const uniquePlayers = await prisma.tournamentParticipant.count({
      where: { tournamentId: tournament28.id }
    });

    console.log(`  📊 Total eliminaciones: ${totalEliminations}`);
    console.log(`  🏆 Total registros ranking: ${totalRankingRecords}`);
    console.log(`  👥 Participantes únicos: ${uniquePlayers}`);
    console.log(`  📅 Fechas con datos: ${existingDates.length}/8`);

    // 7. Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    if (totalEliminations > 0 && totalRankingRecords === 0) {
      console.log('  🔧 Ejecutar script para poblar TournamentRanking desde eliminaciones');
    }
    if (missingDates.length > 0) {
      console.log('  📁 Re-ejecutar importación para fechas faltantes');
    }
    if (problems.length > 0) {
      console.log('  🛠️ Ejecutar scripts de reparación de datos');
    }

  } catch (error) {
    console.error('💥 Error durante diagnóstico:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar diagnóstico
diagnoseDatabaseState()
  .then(() => {
    console.log('\n🎉 Diagnóstico completado');
  })
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });