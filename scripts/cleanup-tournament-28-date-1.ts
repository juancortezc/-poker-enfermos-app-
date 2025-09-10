import { prisma } from '../src/lib/prisma.js';

async function cleanupTournament28Date1() {
  console.log('🧹 LIMPIANDO FECHA 1 DEL TORNEO 28...\n');

  try {
    // 1. Obtener Fecha 1 del Torneo 28
    const fecha1 = await prisma.gameDate.findFirst({
      where: {
        tournament: { number: 28 },
        dateNumber: 1
      },
      include: {
        eliminations: true,
        timerStates: true,
        tournamentRankings: true
      }
    });

    if (!fecha1) {
      console.log('❌ Fecha 1 no encontrada');
      return;
    }

    console.log(`📅 Fecha 1 encontrada (ID: ${fecha1.id})`);
    console.log(`Status actual: ${fecha1.status}`);
    console.log(`Eliminaciones: ${fecha1.eliminations.length}`);
    console.log(`Timer states: ${fecha1.timerStates.length}`);
    console.log(`Rankings: ${fecha1.tournamentRankings.length}\n`);

    // 2. Ejecutar limpieza en transacción
    await prisma.$transaction(async (tx) => {
      // Eliminar eliminaciones existentes
      if (fecha1.eliminations.length > 0) {
        const deletedEliminations = await tx.elimination.deleteMany({
          where: { gameDateId: fecha1.id }
        });
        console.log(`✅ Eliminadas ${deletedEliminations.count} eliminaciones`);
      }

      // Eliminar timer states
      if (fecha1.timerStates.length > 0) {
        const deletedTimerStates = await tx.timerState.deleteMany({
          where: { gameDateId: fecha1.id }
        });
        console.log(`✅ Eliminados ${deletedTimerStates.count} timer states`);
      }

      // Eliminar tournament rankings de esta fecha
      if (fecha1.tournamentRankings.length > 0) {
        const deletedRankings = await tx.tournamentRanking.deleteMany({
          where: { 
            tournamentId: 1, // Tournament 28
            gameDateId: fecha1.id 
          }
        });
        console.log(`✅ Eliminados ${deletedRankings.count} tournament rankings`);
      }

      // Actualizar status de Fecha 1 a pending para importación limpia
      await tx.gameDate.update({
        where: { id: fecha1.id },
        data: {
          status: 'pending',
          startTime: null
        }
      });
      console.log(`✅ Fecha 1 status actualizado a: pending`);

      // Eliminar cualquier GameResult asociado
      const deletedGameResults = await tx.gameResult.deleteMany({
        where: { gameDateId: fecha1.id }
      });
      console.log(`✅ Eliminados ${deletedGameResults.count} game results`);
    });

    console.log('\n🎉 LIMPIEZA COMPLETADA EXITOSAMENTE');
    console.log('📋 Fecha 1 lista para importación de datos históricos');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar con confirmación
console.log('⚠️  ADVERTENCIA: Este script eliminará TODA la data actual de la Fecha 1');
console.log('✅ Fecha 1 quedará limpia y lista para importar datos históricos\n');

cleanupTournament28Date1()
  .then(() => {
    console.log('\n✨ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  });