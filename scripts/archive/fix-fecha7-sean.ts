import { prisma } from '../src/lib/prisma.js';

async function fixFecha7Sean() {
  console.log('=== CORRIGIENDO FECHA 7 - SEAN WILLIS GANADOR ===\n');

  try {
    // 1. Obtener fecha 7
    const fecha7 = await prisma.gameDate.findFirst({
      where: {
        tournament: { number: 28 },
        dateNumber: 7
      },
      include: {
        eliminations: {
          include: {
            eliminatedPlayer: true
          },
          orderBy: { position: 'desc' }
        }
      }
    });

    if (!fecha7) {
      console.error('❌ No se encontró fecha 7');
      return;
    }

    console.log(`🔍 FECHA 7 (ID: ${fecha7.id}) - ELIMINACIONES ACTUALES: ${fecha7.eliminations.length}`);
    
    // 2. Buscar Sean Willis
    const seanPlayer = await prisma.player.findFirst({
      where: {
        firstName: 'Sean',
        lastName: 'Willis'
      }
    });

    if (!seanPlayer) {
      console.error('❌ No se encontró Sean Willis');
      return;
    }

    console.log(`👤 Sean Willis encontrado (ID: ${seanPlayer.id})`);

    // 3. Verificar si Sean ya tiene eliminación en fecha 7
    const seanEliminacion = fecha7.eliminations.find(e => 
      e.eliminatedPlayerId === seanPlayer.id
    );

    if (seanEliminacion) {
      console.log(`⚠️ Sean ya tiene eliminación: Pos ${seanEliminacion.position} (${seanEliminacion.points} pts)`);
      console.log('No debería estar registrado como eliminado si ganó');
    } else {
      console.log('✅ Sean no está en eliminaciones (correcto para ganador)');
    }

    // 4. Verificar posición 1 actual
    const ganadorActual = fecha7.eliminations.find(e => e.position === 1);
    if (ganadorActual) {
      console.log(`🏆 Ganador actual registrado: ${ganadorActual.eliminatedPlayer.firstName} ${ganadorActual.eliminatedPlayer.lastName} (${ganadorActual.points} pts)`);
      console.log('❌ PROBLEMA: El ganador no debería estar en eliminaciones');
    } else {
      console.log('❌ PROBLEMA: No hay ganador registrado en posición 1');
    }

    // 5. Agregar Sean como ganador (posición 1)
    console.log('\n🔧 AGREGANDO SEAN WILLIS COMO GANADOR...');
    
    await prisma.elimination.create({
      data: {
        gameDate: { connect: { id: fecha7.id } },
        eliminatedPlayer: { connect: { id: seanPlayer.id } },
        eliminatorPlayer: { connect: { id: seanPlayer.id } }, // Ganador se elimina a sí mismo
        position: 1,
        points: 29,
        eliminationTime: new Date().toISOString()
      }
    });

    console.log('✅ Sean Willis agregado como ganador (Pos 1, 29 pts)');

    // 6. Verificar resultado
    console.log('\n🔍 VERIFICANDO RESULTADO...');
    const fecha7Updated = await prisma.gameDate.findUnique({
      where: { id: fecha7.id },
      include: {
        eliminations: {
          include: {
            eliminatedPlayer: true
          },
          orderBy: { position: 'desc' }
        }
      }
    });

    if (fecha7Updated) {
      const eliminacionesRegistrados = fecha7Updated.eliminations.filter(elim => {
        const nombre = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
        return !['Apolinar Externo', 'Invitado SN', 'Agustin Guerrero', 'Jose Patricio  Moreno', 'Meche Garrido'].includes(nombre);
      });

      console.log('\n📊 ELIMINACIONES FECHA 7 CORREGIDAS:');
      console.log('| Pos | Jugador | Pts |');
      console.log('|-----|---------|-----|');
      
      eliminacionesRegistrados
        .sort((a, b) => a.position - b.position) // Ordenar por posición ascendente
        .forEach(elim => {
          const nombre = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
          console.log(`| ${elim.position.toString().padStart(3)} | ${nombre.padEnd(20)} | ${elim.points.toString().padStart(3)} |`);
        });
    }

    console.log('\n🎉 CORRECCIÓN COMPLETADA');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixFecha7Sean();