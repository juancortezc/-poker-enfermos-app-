import { prisma } from '../src/lib/prisma.js';

async function fixGameDatePlayerIds() {
  console.log('🔧 ARREGLANDO PLAYER_IDS EN GAME DATES\n');
  console.log('='.repeat(70));

  try {
    const gameDates = await prisma.gameDate.findMany({
      where: {
        tournament: { number: 28 },
        status: 'completed'
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

    console.log(`📅 Fechas completadas encontradas: ${gameDates.length}`);

    for (const gameDate of gameDates) {
      console.log(`\n📅 Procesando Fecha ${gameDate.dateNumber}:`);
      console.log(`  Estado actual playerIds: ${gameDate.playerIds?.length || 0} jugadores`);
      console.log(`  Eliminaciones: ${gameDate.eliminations.length}`);

      if (gameDate.eliminations.length === 0) {
        console.log('  ⚠️ Sin eliminaciones, saltando...');
        continue;
      }

      // Extraer todos los jugadores únicos de las eliminaciones
      const uniquePlayerIds = new Set<string>();
      
      gameDate.eliminations.forEach(elimination => {
        // Agregar jugador eliminado
        uniquePlayerIds.add(elimination.eliminatedPlayerId);
        
        // Agregar eliminador si es diferente al eliminado
        if (elimination.eliminatorPlayerId && 
            elimination.eliminatorPlayerId !== elimination.eliminatedPlayerId) {
          uniquePlayerIds.add(elimination.eliminatorPlayerId);
        }
      });

      const playerIdsArray = Array.from(uniquePlayerIds);
      console.log(`  🎯 Jugadores únicos encontrados: ${playerIdsArray.length}`);

      // Verificar si ya tiene los playerIds correctos
      const currentPlayerIds = gameDate.playerIds || [];
      const needsUpdate = currentPlayerIds.length !== playerIdsArray.length ||
                         !playerIdsArray.every(id => currentPlayerIds.includes(id));

      if (needsUpdate) {
        // Actualizar GameDate con los playerIds correctos
        await prisma.gameDate.update({
          where: { id: gameDate.id },
          data: {
            playerIds: playerIdsArray
          }
        });

        console.log(`  ✅ Actualizado: ${currentPlayerIds.length} → ${playerIdsArray.length} jugadores`);
      } else {
        console.log(`  ✅ Ya está correcto: ${currentPlayerIds.length} jugadores`);
      }
    }

    // Verificación final
    console.log('\n🔍 VERIFICACIÓN FINAL:');
    const updatedGameDates = await prisma.gameDate.findMany({
      where: {
        tournament: { number: 28 },
        status: 'completed'
      },
      select: {
        dateNumber: true,
        playerIds: true,
        _count: {
          select: {
            eliminations: true
          }
        }
      },
      orderBy: { dateNumber: 'asc' }
    });

    console.log('Fecha | PlayerIds | Eliminaciones');
    console.log('------|-----------|-------------');
    
    updatedGameDates.forEach(gd => {
      const playerCount = gd.playerIds?.length || 0;
      const elimCount = gd._count.eliminations;
      console.log(`  ${gd.dateNumber}   |     ${playerCount}     |      ${elimCount}`);
    });

    console.log('\n🎉 CORRECCIÓN DE PLAYER_IDS COMPLETADA');

  } catch (error) {
    console.error('💥 Error arreglando playerIds:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixGameDatePlayerIds()
    .then(() => {
      console.log('\n✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}