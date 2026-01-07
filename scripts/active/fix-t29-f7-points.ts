import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para corregir los puntos de la fecha 7 del Torneo 29
 * Los puntos deben seguir la tabla especial para 17 jugadores
 */

// Tabla de puntos correcta para 17 jugadores
const POINTS_TABLE_17: Record<number, number> = {
  17: 1,
  16: 2,
  15: 3,
  14: 4,
  13: 5,
  12: 6,
  11: 7,
  10: 8,
  9: 10,
  8: 11,
  7: 12,
  6: 13,
  5: 14,
  4: 15,
  3: 18,
  2: 21,
  1: 24
};

async function fixPoints() {
  try {
    console.log('🔧 CORRECCIÓN DE PUNTOS: Torneo 29 - Fecha 7');
    console.log('='.repeat(60));

    // Buscar la fecha 7 del Torneo 29
    const gameDate = await prisma.gameDate.findFirst({
      where: {
        tournament: { number: 29 },
        dateNumber: 7
      }
    });

    if (!gameDate) {
      console.error('❌ No se encontró la fecha 7 del Torneo 29');
      return;
    }

    console.log(`\n📅 Fecha encontrada: ID ${gameDate.id}`);
    console.log(`   Jugadores: ${gameDate.playerIds.length}`);

    // Obtener eliminaciones actuales
    const eliminations = await prisma.elimination.findMany({
      where: { gameDateId: gameDate.id },
      include: { eliminatedPlayer: true },
      orderBy: { position: 'asc' }
    });

    console.log('\n📊 Corrigiendo puntos:');
    console.log('-'.repeat(60));

    for (const elim of eliminations) {
      const correctPoints = POINTS_TABLE_17[elim.position];

      if (elim.points !== correctPoints) {
        await prisma.elimination.update({
          where: { id: elim.id },
          data: { points: correctPoints }
        });
        console.log(`   Pos ${elim.position}: ${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName} | ${elim.points} -> ${correctPoints} pts ✓`);
      } else {
        console.log(`   Pos ${elim.position}: ${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName} | ${correctPoints} pts (ok)`);
      }
    }

    console.log('\n✅ Puntos corregidos');
    console.log('='.repeat(60));

    // Mostrar resultado final
    const finalEliminations = await prisma.elimination.findMany({
      where: { gameDateId: gameDate.id },
      include: { eliminatedPlayer: true, eliminatorPlayer: true },
      orderBy: { position: 'desc' }
    });

    console.log('\n📋 Resultado final:');
    console.log('-'.repeat(60));
    finalEliminations.forEach(e => {
      console.log(`   Pos ${e.position}: ${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName} -> ${e.points} pts`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPoints();
