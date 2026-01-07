#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getTournamentWinnersSummary(tournamentId: number = 1) {
  console.log('🏆 RESUMEN COMPLETO DE GANADORES - TORNEO 28\n');
  console.log('━'.repeat(80));

  try {
    // Obtener todas las fechas completadas con ganadores
    const completedDatesWithWinners = await prisma.gameDate.findMany({
      where: {
        tournamentId: tournamentId,
        status: 'completed'
      },
      include: {
        eliminations: {
          where: { position: 1 },
          include: {
            eliminatedPlayer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                aliases: true,
                lastVictoryDate: true,
                photoUrl: true
              }
            }
          }
        }
      },
      orderBy: { dateNumber: 'asc' }
    });

    console.log('\n📋 GANADORES POR FECHA:\n');

    const winnersData: Array<{
      dateNumber: number;
      date: string;
      playerId: string;
      playerName: string;
      alias: string;
      points: number;
      totalPlayers: number;
      lastVictoryDate: string | null;
    }> = [];

    for (const gameDate of completedDatesWithWinners) {
      if (gameDate.eliminations.length > 0) {
        const winner = gameDate.eliminations[0];
        const winnerData = {
          dateNumber: gameDate.dateNumber,
          date: gameDate.scheduledDate.toLocaleDateString('es-ES'),
          playerId: winner.eliminatedPlayer.id,
          playerName: `${winner.eliminatedPlayer.firstName} ${winner.eliminatedPlayer.lastName}`,
          alias: winner.eliminatedPlayer.aliases[0] || winner.eliminatedPlayer.firstName,
          points: winner.points,
          totalPlayers: gameDate.playerIds.length,
          lastVictoryDate: winner.eliminatedPlayer.lastVictoryDate
        };

        winnersData.push(winnerData);

        console.log(`   📅 Fecha ${winnerData.dateNumber} (${winnerData.date}):`);
        console.log(`      🏆 Ganador: ${winnerData.playerName} (${winnerData.alias})`);
        console.log(`      📊 ${winnerData.points} puntos - ${winnerData.totalPlayers} jugadores`);
        console.log(`      🗓️  Last Victory Date: ${winnerData.lastVictoryDate || 'NO ACTUALIZADO'}\n`);
      }
    }

    // Análisis de múltiples victorias
    const victoryCount: { [playerId: string]: { 
      count: number; 
      name: string; 
      alias: string; 
      dates: number[];
      totalPoints: number;
      lastVictory: string | null;
    } } = {};

    winnersData.forEach(winner => {
      if (!victoryCount[winner.playerId]) {
        victoryCount[winner.playerId] = {
          count: 0,
          name: winner.playerName,
          alias: winner.alias,
          dates: [],
          totalPoints: 0,
          lastVictory: winner.lastVictoryDate
        };
      }
      victoryCount[winner.playerId].count++;
      victoryCount[winner.playerId].dates.push(winner.dateNumber);
      victoryCount[winner.playerId].totalPoints += winner.points;
    });

    console.log('\n🏆 RANKING DE GANADORES:\n');
    
    const sortedByVictories = Object.entries(victoryCount)
      .sort(([,a], [,b]) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.totalPoints - a.totalPoints;
      });

    sortedByVictories.forEach(([playerId, data], index) => {
      const trophy = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏆';
      console.log(`   ${trophy} ${data.name} (${data.alias}):`);
      console.log(`      ✅ ${data.count} victoria${data.count > 1 ? 's' : ''}`);
      console.log(`      📅 Fechas: ${data.dates.join(', ')}`);
      console.log(`      📊 ${data.totalPoints} puntos totales`);
      console.log(`      🗓️  Última victoria: ${data.lastVictory || 'NO ACTUALIZADO'}\n`);
    });

    console.log('\n📊 ESTADÍSTICAS GENERALES:\n');
    console.log(`   ✅ Total fechas completadas: ${completedDatesWithWinners.length}`);
    console.log(`   🏆 Total jugadores ganadores: ${Object.keys(victoryCount).length}`);
    console.log(`   🔥 Jugadores con múltiples victorias: ${sortedByVictories.filter(([,data]) => data.count > 1).length}`);
    console.log(`   👑 Máximo número de victorias: ${Math.max(...Object.values(victoryCount).map(v => v.count))}`);
    
    const avgPointsPerVictory = winnersData.reduce((sum, w) => sum + w.points, 0) / winnersData.length;
    console.log(`   📈 Promedio puntos por victoria: ${avgPointsPerVictory.toFixed(1)}`);

    const avgPlayersPerDate = winnersData.reduce((sum, w) => sum + w.totalPlayers, 0) / winnersData.length;
    console.log(`   👥 Promedio jugadores por fecha: ${avgPlayersPerDate.toFixed(1)}`);

    // Verificar integridad de lastVictoryDate
    const playersNeedingUpdate = winnersData.filter(w => !w.lastVictoryDate);
    if (playersNeedingUpdate.length > 0) {
      console.log(`\n⚠️  ATENCIÓN: ${playersNeedingUpdate.length} victorias sin lastVictoryDate actualizado`);
    } else {
      console.log(`\n✅ INTEGRIDAD: Todos los ganadores tienen lastVictoryDate actualizado`);
    }

    return winnersData;

  } catch (error) {
    console.error('❌ Error obteniendo resumen de ganadores:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  getTournamentWinnersSummary(1).catch(console.error);
}

export { getTournamentWinnersSummary };