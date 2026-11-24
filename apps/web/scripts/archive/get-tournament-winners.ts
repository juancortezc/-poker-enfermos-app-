#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface WinnerInfo {
  dateNumber: number;
  gameDate: string;
  playerId: string;
  playerName: string;
  playerAlias: string;
  points: number;
  totalPlayers: number;
}

async function getAllWinners(tournamentId: number = 1) {
  console.log(`🏆 GANADORES DEL TORNEO ${tournamentId}\n`);

  try {
    // Obtener todas las fechas completadas del torneo
    const completedDates = await prisma.gameDate.findMany({
      where: {
        tournamentId: tournamentId,
        status: 'completed'
      },
      include: {
        eliminations: {
          where: {
            position: 1 // Solo ganadores
          },
          include: {
            eliminatedPlayer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                aliases: true,
                lastVictoryDate: true
              }
            }
          }
        }
      },
      orderBy: {
        dateNumber: 'asc'
      }
    });

    const winners: WinnerInfo[] = [];
    const totalWinnings: { [playerId: string]: { count: number; name: string; alias: string; dates: number[] } } = {};

    console.log('📅 GANADORES POR FECHA:\n');

    for (const gameDate of completedDates) {
      const winner = gameDate.eliminations[0]; // Debería haber exactamente uno con position: 1
      
      if (winner) {
        const winnerInfo: WinnerInfo = {
          dateNumber: gameDate.dateNumber,
          gameDate: gameDate.scheduledDate.toLocaleDateString('es-ES'),
          playerId: winner.eliminatedPlayer.id,
          playerName: `${winner.eliminatedPlayer.firstName} ${winner.eliminatedPlayer.lastName}`,
          playerAlias: winner.eliminatedPlayer.aliases[0] || winner.eliminatedPlayer.firstName,
          points: winner.points,
          totalPlayers: gameDate.playerIds.length
        };

        winners.push(winnerInfo);

        // Actualizar contadores
        if (!totalWinnings[winner.eliminatedPlayer.id]) {
          totalWinnings[winner.eliminatedPlayer.id] = {
            count: 0,
            name: winnerInfo.playerName,
            alias: winnerInfo.playerAlias,
            dates: []
          };
        }
        totalWinnings[winner.eliminatedPlayer.id].count++;
        totalWinnings[winner.eliminatedPlayer.id].dates.push(gameDate.dateNumber);

        console.log(`   Fecha ${gameDate.dateNumber}: ${winnerInfo.playerName} (${winnerInfo.playerAlias})`);
        console.log(`   📅 ${winnerInfo.gameDate} - ${winnerInfo.points} puntos - ${winnerInfo.totalPlayers} jugadores`);
        console.log(`   🗓️  LastVictoryDate actual: ${winner.eliminatedPlayer.lastVictoryDate || 'NO REGISTRADO'}\n`);
      } else {
        console.log(`   ❌ Fecha ${gameDate.dateNumber}: NO HAY GANADOR REGISTRADO\n`);
      }
    }

    console.log('\n🏆 RESUMEN DE GANADORES:\n');
    
    // Ordenar por número de victorias
    const sortedWinners = Object.entries(totalWinnings)
      .sort(([,a], [,b]) => b.count - a.count);

    for (const [playerId, data] of sortedWinners) {
      console.log(`   ${data.name} (${data.alias}): ${data.count} victoria${data.count > 1 ? 's' : ''}`);
      console.log(`   📅 Fechas ganadas: ${data.dates.join(', ')}\n`);
    }

    console.log('\n📊 ESTADÍSTICAS:\n');
    console.log(`   Total fechas completadas: ${completedDates.length}`);
    console.log(`   Total jugadores con victorias: ${Object.keys(totalWinnings).length}`);
    console.log(`   Jugadores con múltiples victorias: ${sortedWinners.filter(([,data]) => data.count > 1).length}`);

    return winners;

  } catch (error) {
    console.error('❌ Error obteniendo ganadores:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para actualizar lastVictoryDate basado en las victorias
async function updateLastVictoryDates(tournamentId: number = 1) {
  console.log('\n🔄 ACTUALIZANDO LAST VICTORY DATES...\n');

  try {
    // Obtener la última victoria de cada jugador
    const latestVictories = await prisma.elimination.findMany({
      where: {
        position: 1,
        gameDate: {
          tournamentId: tournamentId,
          status: 'completed'
        }
      },
      include: {
        gameDate: {
          select: {
            scheduledDate: true
          }
        },
        eliminatedPlayer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            lastVictoryDate: true
          }
        }
      },
      orderBy: {
        eliminationTime: 'desc'
      }
    });

    // Agrupar por jugador y obtener la fecha más reciente
    const playerLatestVictory: { [playerId: string]: { date: Date; currentLastVictory?: string; name: string } } = {};

    for (const victory of latestVictories) {
      const playerId = victory.eliminatedPlayer.id;
      const victoryDate = victory.gameDate.scheduledDate;
      const playerName = `${victory.eliminatedPlayer.firstName} ${victory.eliminatedPlayer.lastName}`;

      if (!playerLatestVictory[playerId] || victoryDate > playerLatestVictory[playerId].date) {
        playerLatestVictory[playerId] = {
          date: victoryDate,
          currentLastVictory: victory.eliminatedPlayer.lastVictoryDate,
          name: playerName
        };
      }
    }

    // Actualizar cada jugador
    let updated = 0;
    for (const [playerId, victoryData] of Object.entries(playerLatestVictory)) {
      const newDateString = victoryData.date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Solo actualizar si es diferente
      if (victoryData.currentLastVictory !== newDateString) {
        await prisma.player.update({
          where: { id: playerId },
          data: { lastVictoryDate: newDateString }
        });
        
        console.log(`   ✅ ${victoryData.name}:`);
        console.log(`      Anterior: ${victoryData.currentLastVictory || 'NO REGISTRADO'}`);
        console.log(`      Nuevo: ${newDateString}\n`);
        updated++;
      } else {
        console.log(`   ⏸️  ${victoryData.name}: Ya actualizado (${newDateString})\n`);
      }
    }

    console.log(`🎉 Actualización completada: ${updated} jugadores actualizados`);

  } catch (error) {
    console.error('❌ Error actualizando lastVictoryDate:', error);
    throw error;
  }
}

// Ejecutar script
async function main() {
  const tournamentId = process.argv[2] ? parseInt(process.argv[2]) : 1;
  
  console.log('🎯 ANÁLISIS DE GANADORES Y ACTUALIZACIÓN DE LAST VICTORY DATE\n');
  console.log('━'.repeat(80));
  
  // Obtener ganadores
  await getAllWinners(tournamentId);
  
  // Actualizar lastVictoryDate
  await updateLastVictoryDates(tournamentId);
}

if (require.main === module) {
  main().catch(console.error);
}

export { getAllWinners, updateLastVictoryDates };