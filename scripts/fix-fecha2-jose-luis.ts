import { prisma } from '../src/lib/prisma.js';

async function fixFecha2JoseLuis() {
  console.log('=== CORRIGIENDO ERROR FECHA 2 - JOSE LUIS TORAL ===\n');

  try {
    // 1. Obtener fecha 2 con eliminaciones
    const fecha2 = await prisma.gameDate.findFirst({
      where: {
        tournament: { number: 28 },
        dateNumber: 2
      },
      include: {
        eliminations: {
          include: {
            eliminatedPlayer: true,
            eliminatorPlayer: true
          },
          orderBy: { position: 'desc' }
        }
      }
    });

    if (!fecha2) {
      console.error('❌ No se encontró fecha 2');
      return;
    }

    console.log('🔍 ELIMINACIONES ACTUALES FECHA 2:');
    fecha2.eliminations.forEach(elim => {
      const eliminatedName = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
      console.log(`Pos ${elim.position}: ${eliminatedName} (${elim.points} pts) - ID: ${elim.id}`);
    });

    // 2. Buscar Jose Luis Toral (con doble espacio)
    const joseLuisPlayer = await prisma.player.findFirst({
      where: {
        firstName: 'Jose Luis',
        lastName: 'Toral'
      }
    });
    
    if (!joseLuisPlayer) {
      // Buscar con doble espacio
      const joseLuisPlayer2 = await prisma.player.findFirst({
        where: {
          firstName: 'Jose Luis',
          lastName: ' Toral'
        }
      });
      if (joseLuisPlayer2) {
        console.log('Encontrado con doble espacio');
      }
    }

    if (!joseLuisPlayer) {
      console.error('❌ No se encontró Jose Luis Toral');
      return;
    }

    console.log(`\n📋 Jose Luis Toral ID: ${joseLuisPlayer.id}`);

    // 3. Buscar Juan Antonio Cortez
    const juanAntonioPlayer = await prisma.player.findFirst({
      where: {
        firstName: 'Juan Antonio',
        lastName: 'Cortez'
      }
    });

    if (!juanAntonioPlayer) {
      console.error('❌ No se encontró Juan Antonio Cortez');
      return;
    }

    console.log(`📋 Juan Antonio Cortez ID: ${juanAntonioPlayer.id}`);

    // 4. Buscar eliminaciones problemáticas
    const eliminacionPos6 = fecha2.eliminations.find(e => e.position === 6);
    const eliminacionPos13JoseLuis = fecha2.eliminations.find(e => 
      e.position === 13 && e.eliminatedPlayerId === joseLuisPlayer.id
    );
    const eliminacionPos6JoseLuis = fecha2.eliminations.find(e => 
      e.position === 6 && e.eliminatedPlayerId === joseLuisPlayer.id
    );

    console.log('\n🔍 ANÁLISIS DE ELIMINACIONES:');
    
    if (eliminacionPos6) {
      console.log(`Pos 6 actual: ${eliminacionPos6.eliminatedPlayer?.firstName} ${eliminacionPos6.eliminatedPlayer?.lastName} (${eliminacionPos6.points} pts)`);
    }
    
    if (eliminacionPos13JoseLuis) {
      console.log(`Pos 13 Jose Luis: Encontrada (${eliminacionPos13JoseLuis.points} pts)`);
    } else {
      console.log(`Pos 13 Jose Luis: NO encontrada`);
    }
    
    if (eliminacionPos6JoseLuis) {
      console.log(`Pos 6 Jose Luis: Encontrada INCORRECTAMENTE (${eliminacionPos6JoseLuis.points} pts)`);
    }

    // 5. Plan de corrección
    console.log('\n📝 PLAN DE CORRECCIÓN:');
    
    if (eliminacionPos6JoseLuis) {
      console.log(`1. Corregir eliminación ID ${eliminacionPos6JoseLuis.id}:`);
      console.log(`   - Cambiar eliminatedPlayerId de ${joseLuisPlayer.id} a ${juanAntonioPlayer.id}`);
      console.log(`   - Mantener posición 6 y puntos 19`);
    }
    
    if (eliminacionPos13JoseLuis && eliminacionPos13JoseLuis.points !== 11) {
      console.log(`2. Corregir eliminación ID ${eliminacionPos13JoseLuis.id}:`);
      console.log(`   - Mantener eliminatedPlayerId ${joseLuisPlayer.id}`);
      console.log(`   - Cambiar puntos de ${eliminacionPos13JoseLuis.points} a 11`);
    }

    // 6. Ejecutar correcciones
    console.log('\n🔧 EJECUTANDO CORRECCIONES...');

    if (eliminacionPos6JoseLuis) {
      await prisma.elimination.update({
        where: { id: eliminacionPos6JoseLuis.id },
        data: {
          eliminatedPlayerId: juanAntonioPlayer.id
        }
      });
      console.log(`✅ Corregida posición 6: Ahora es Juan Antonio Cortez`);
    }

    if (eliminacionPos13JoseLuis && eliminacionPos13JoseLuis.points !== 11) {
      await prisma.elimination.update({
        where: { id: eliminacionPos13JoseLuis.id },
        data: {
          points: 11
        }
      });
      console.log(`✅ Corregidos puntos posición 13: Jose Luis Toral ahora tiene 11 pts`);
    }

    console.log('\n🎉 CORRECCIÓN COMPLETADA');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixFecha2JoseLuis();