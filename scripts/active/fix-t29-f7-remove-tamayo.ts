import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para corregir la fecha 7 del Torneo 29
 *
 * Problema: Jorge Tamayo está registrado como eliminado en posición 18 por Juan Antonio Cortez,
 * pero en realidad no participó en esa fecha.
 *
 * Correcciones necesarias:
 * 1. Eliminar la eliminación de Jorge Tamayo
 * 2. Eliminar el GameResult de Jorge Tamayo
 * 3. Remover a Jorge Tamayo de playerIds de la fecha
 * 4. Ajustar las posiciones de todas las eliminaciones (de 18 jugadores a 17)
 * 5. Recalcular los puntos según la tabla de 17 jugadores
 */

// Tabla de puntos para 17 jugadores (posición -> puntos)
function getPointsForPosition(position: number, totalPlayers: number): number {
  // Sistema de puntos estándar del torneo
  // Los puntos se calculan según la posición relativa al total de jugadores
  // Posición 1 (ganador) = totalPlayers puntos
  // Última posición = 1 punto
  return totalPlayers - position + 1;
}

async function fixT29F7() {
  try {
    console.log('🔧 CORRECCIÓN: Torneo 29 - Fecha 7');
    console.log('='.repeat(60));
    console.log('');
    console.log('📋 Problema: Jorge Tamayo registrado incorrectamente');
    console.log('   - Aparece en posición 18 eliminado por Juan Antonio Cortez');
    console.log('   - En realidad NO participó en esta fecha');
    console.log('   - Debe haber 17 jugadores, no 18');
    console.log('');

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

    console.log(`✅ Fecha encontrada: ${gameDate.tournament.name} - Fecha ${gameDate.dateNumber}`);
    console.log(`   ID: ${gameDate.id}`);
    console.log(`   Jugadores registrados: ${gameDate.playerIds.length}`);
    console.log('');

    // 2. Buscar a Jorge Tamayo
    const jorgeTamayo = await prisma.player.findFirst({
      where: {
        firstName: { contains: 'Jorge', mode: 'insensitive' },
        lastName: { contains: 'Tamayo', mode: 'insensitive' }
      }
    });

    if (!jorgeTamayo) {
      console.error('❌ No se encontró a Jorge Tamayo');
      return;
    }

    console.log(`👤 Jorge Tamayo encontrado: ${jorgeTamayo.firstName} ${jorgeTamayo.lastName}`);
    console.log(`   ID: ${jorgeTamayo.id}`);
    console.log('');

    // 3. Verificar su eliminación actual
    const tamayoElimination = await prisma.elimination.findFirst({
      where: {
        gameDateId: gameDate.id,
        eliminatedPlayerId: jorgeTamayo.id
      },
      include: {
        eliminatorPlayer: true
      }
    });

    if (tamayoElimination) {
      console.log('🔍 Eliminación encontrada de Jorge Tamayo:');
      console.log(`   Posición: ${tamayoElimination.position}`);
      console.log(`   Eliminador: ${tamayoElimination.eliminatorPlayer?.firstName} ${tamayoElimination.eliminatorPlayer?.lastName}`);
      console.log(`   Puntos: ${tamayoElimination.points}`);
      console.log('');
    } else {
      console.log('⚠️  No se encontró eliminación de Jorge Tamayo en esta fecha');
      console.log('   Ya fue corregido anteriormente o nunca existió.');
      return;
    }

    // 4. Obtener todas las eliminaciones actuales
    const allEliminations = await prisma.elimination.findMany({
      where: { gameDateId: gameDate.id },
      include: {
        eliminatedPlayer: true,
        eliminatorPlayer: true
      },
      orderBy: { position: 'desc' } // Ordenar por posición descendente (18, 17, 16...)
    });

    console.log('📊 Eliminaciones actuales (antes de corrección):');
    console.log('-'.repeat(60));
    allEliminations.forEach(e => {
      const isJorge = e.eliminatedPlayerId === jorgeTamayo.id ? ' ⚠️ A ELIMINAR' : '';
      console.log(`   Pos ${e.position}: ${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName} -> ${e.points} pts${isJorge}`);
    });
    console.log('');

    // 5. Ejecutar correcciones SIN transacción larga
    console.log('⚡ EJECUTANDO CORRECCIONES...');
    console.log('');

    // A. Eliminar la eliminación de Jorge Tamayo
    await prisma.elimination.delete({
      where: { id: tamayoElimination.id }
    });
    console.log('✓ Eliminación de Jorge Tamayo eliminada');

    // B. Eliminar GameResult de Jorge Tamayo
    const deletedResults = await prisma.gameResult.deleteMany({
      where: {
        playerId: jorgeTamayo.id,
        gameDateId: gameDate.id
      }
    });
    console.log(`✓ ${deletedResults.count} GameResult(s) de Jorge Tamayo eliminado(s)`);

    // C. Remover de playerIds
    if (gameDate.playerIds.includes(jorgeTamayo.id)) {
      const newPlayerIds = gameDate.playerIds.filter(id => id !== jorgeTamayo.id);
      await prisma.gameDate.update({
        where: { id: gameDate.id },
        data: { playerIds: newPlayerIds }
      });
      console.log(`✓ Removido de playerIds (${gameDate.playerIds.length} -> ${newPlayerIds.length} jugadores)`);
    }

    // D. Eliminar TournamentRanking de Jorge Tamayo para esta fecha
    const deletedRankings = await prisma.tournamentRanking.deleteMany({
      where: {
        tournamentId: gameDate.tournamentId,
        gameDateId: gameDate.id,
        playerId: jorgeTamayo.id
      }
    });
    console.log(`✓ ${deletedRankings.count} TournamentRanking(s) de Jorge Tamayo eliminado(s)`);

    // E. Ajustar posiciones y puntos de las demás eliminaciones
    const eliminationsToUpdate = allEliminations.filter(e => e.eliminatedPlayerId !== jorgeTamayo.id);

    console.log('');
    console.log('📝 Ajustando posiciones y puntos (17 jugadores):');
    console.log('-'.repeat(60));

    for (const elim of eliminationsToUpdate) {
      // Como Tamayo estaba en la última posición (18), las posiciones de los demás se mantienen
      // pero los puntos deben recalcularse para 17 jugadores
      const newPosition = elim.position > tamayoElimination.position
        ? elim.position - 1
        : elim.position;
      const newPoints = getPointsForPosition(newPosition, 17);

      if (newPosition !== elim.position || newPoints !== elim.points) {
        await prisma.elimination.update({
          where: { id: elim.id },
          data: {
            position: newPosition,
            points: newPoints
          }
        });
        console.log(`   Pos ${elim.position} -> ${newPosition}: ${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName} | ${elim.points} -> ${newPoints} pts`);
      } else {
        console.log(`   Pos ${newPosition}: ${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName} | ${newPoints} pts (sin cambios)`);
      }
    }

    // F. Actualizar GameResults de los demás jugadores
    console.log('');
    console.log('📝 Actualizando GameResults:');

    for (const elim of eliminationsToUpdate) {
      const newPosition = elim.position > tamayoElimination.position
        ? elim.position - 1
        : elim.position;
      const newPoints = getPointsForPosition(newPosition, 17);

      await prisma.gameResult.updateMany({
        where: {
          playerId: elim.eliminatedPlayerId,
          gameDateId: gameDate.id
        },
        data: { points: newPoints }
      });
    }
    console.log('✓ GameResults actualizados');

    // G. Actualizar TournamentRankings
    console.log('');
    console.log('📝 Actualizando TournamentRankings:');

    for (const elim of eliminationsToUpdate) {
      const newPosition = elim.position > tamayoElimination.position
        ? elim.position - 1
        : elim.position;

      const ranking = await prisma.tournamentRanking.findFirst({
        where: {
          tournamentId: gameDate.tournamentId,
          gameDateId: gameDate.id,
          playerId: elim.eliminatedPlayerId
        }
      });

      if (ranking) {
        const updatedPositions = ranking.eliminationPositions.map(p =>
          p === elim.position ? newPosition : p
        );

        await prisma.tournamentRanking.update({
          where: { id: ranking.id },
          data: {
            eliminationPositions: updatedPositions
          }
        });
      }
    }
    console.log('✓ TournamentRankings actualizados');

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ CORRECCIÓN COMPLETADA EXITOSAMENTE');
    console.log('');

    // Mostrar resultado final
    const finalEliminations = await prisma.elimination.findMany({
      where: { gameDateId: gameDate.id },
      include: {
        eliminatedPlayer: true,
        eliminatorPlayer: true
      },
      orderBy: { position: 'desc' }
    });

    const finalGameDate = await prisma.gameDate.findUnique({
      where: { id: gameDate.id }
    });

    console.log('📊 Estado final:');
    console.log(`   Jugadores en fecha: ${finalGameDate?.playerIds.length}`);
    console.log(`   Eliminaciones registradas: ${finalEliminations.length}`);
    console.log('');
    console.log('📋 Eliminaciones finales:');
    console.log('-'.repeat(60));
    finalEliminations.forEach(e => {
      console.log(`   Pos ${e.position}: ${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName} -> ${e.points} pts (por ${e.eliminatorPlayer?.firstName} ${e.eliminatorPlayer?.lastName})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixT29F7();
