import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Winner {
  playerId: string;
  playerName: string;
  gameDateId: number;
  dateNumber: number;
  scheduledDate: string;
  points: number;
}

async function populateLastVictoryDates() {
  console.log('🏆 Iniciando proceso de población de lastVictoryDate...\n');

  try {
    // Obtener el torneo activo (ID: 1)
    const tournament = await prisma.tournament.findFirst({
      where: { status: 'ACTIVO' },
      include: {
        gameDates: {
          where: { status: 'completed' },
          orderBy: { dateNumber: 'asc' }
        }
      }
    });

    if (!tournament) {
      throw new Error('No se encontró torneo activo');
    }

    console.log(`📊 Torneo encontrado: ${tournament.name}`);
    console.log(`📅 Fechas completadas: ${tournament.gameDates.length}\n`);

    // Buscar ganadores de cada fecha (posición 1)
    const winners: Winner[] = [];

    for (const gameDate of tournament.gameDates) {
      console.log(`🔍 Analizando Fecha ${gameDate.dateNumber} (${gameDate.scheduledDate.toLocaleDateString('es-EC')})...`);
      
      const winner = await prisma.elimination.findFirst({
        where: {
          gameDateId: gameDate.id,
          position: 1
        },
        include: {
          eliminatedPlayer: true
        }
      });

      if (winner) {
        const winnerData: Winner = {
          playerId: winner.eliminatedPlayer.id,
          playerName: `${winner.eliminatedPlayer.firstName} ${winner.eliminatedPlayer.lastName}`,
          gameDateId: gameDate.id,
          dateNumber: gameDate.dateNumber,
          scheduledDate: gameDate.scheduledDate.toLocaleDateString('es-EC'),
          points: winner.points
        };
        
        winners.push(winnerData);
        console.log(`   ✅ Ganador: ${winnerData.playerName} (${winnerData.points} pts)`);
      } else {
        console.log(`   ❌ No se encontró ganador para esta fecha`);
      }
    }

    console.log(`\n🏆 RESUMEN DE GANADORES (${winners.length} fechas):`);
    console.log('═'.repeat(80));

    // Agrupar ganadores para ver múltiples victorias
    const winnerCounts = new Map<string, Winner[]>();
    winners.forEach(winner => {
      const key = winner.playerName;
      if (!winnerCounts.has(key)) {
        winnerCounts.set(key, []);
      }
      winnerCounts.get(key)!.push(winner);
    });

    // Mostrar resumen
    for (const [playerName, victories] of winnerCounts) {
      console.log(`\n👑 ${playerName}:`);
      victories.forEach(victory => {
        console.log(`   📅 Fecha ${victory.dateNumber} (${victory.scheduledDate}) - ${victory.points} pts`);
      });
      console.log(`   🎯 Total victorias: ${victories.length}`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`📈 ESTADÍSTICAS:`);
    console.log(`   🏆 Total fechas con ganador: ${winners.length}`);
    console.log(`   👤 Jugadores únicos ganadores: ${winnerCounts.size}`);
    console.log(`   🔥 Múltiples victorias: ${Array.from(winnerCounts.values()).filter(v => v.length > 1).length} jugadores`);

    // Actualizar lastVictoryDate para cada ganador
    console.log(`\n🔄 ACTUALIZANDO lastVictoryDate...`);
    
    let updateCount = 0;
    for (const [playerName, victories] of winnerCounts) {
      // Tomar la fecha más reciente de sus victorias
      const latestVictory = victories.sort((a, b) => b.dateNumber - a.dateNumber)[0];
      const lastVictoryDate = latestVictory.scheduledDate;

      await prisma.player.update({
        where: { id: latestVictory.playerId },
        data: { lastVictoryDate }
      });

      console.log(`   ✅ ${playerName}: ${lastVictoryDate}`);
      updateCount++;
    }

    console.log(`\n🎉 PROCESO COMPLETADO EXITOSAMENTE!`);
    console.log(`   📝 Jugadores actualizados: ${updateCount}`);
    console.log(`   🗓️ Última victoria más reciente: ${winners.sort((a, b) => b.dateNumber - a.dateNumber)[0]?.scheduledDate || 'N/A'}`);

    // Verificar datos actualizados
    console.log(`\n🔍 VERIFICACIÓN DE DATOS ACTUALIZADOS:`);
    const playersWithVictories = await prisma.player.findMany({
      where: {
        lastVictoryDate: { not: null }
      },
      select: {
        firstName: true,
        lastName: true,
        lastVictoryDate: true
      },
      orderBy: [
        { firstName: 'asc' }
      ]
    });

    playersWithVictories.forEach(player => {
      console.log(`   ✅ ${player.firstName} ${player.lastName}: ${player.lastVictoryDate}`);
    });

  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
if (require.main === module) {
  populateLastVictoryDates()
    .then(() => {
      console.log('\n✅ Script ejecutado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error ejecutando script:', error);
      process.exit(1);
    });
}

export { populateLastVictoryDates };