import { prisma } from '../src/lib/prisma.js';

async function fixFecha9Positions() {
  console.log('=== CORRIGIENDO FECHA 9 - JUAN TAPIA Y JOFFRE PALACIOS ===\n');

  try {
    // 1. Obtener fecha 9
    const fecha9 = await prisma.gameDate.findFirst({
      where: {
        tournament: { number: 28 },
        dateNumber: 9
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

    if (!fecha9) {
      console.error('❌ No se encontró fecha 9');
      return;
    }

    console.log(`🔍 FECHA 9 (ID: ${fecha9.id}) - ELIMINACIONES ACTUALES: ${fecha9.eliminations.length}`);
    
    // 2. Buscar Juan Tapia y Joffre Palacios
    const juanTapiaPlayer = await prisma.player.findFirst({
      where: {
        firstName: 'Juan',
        lastName: 'Tapia'
      }
    });

    const joffrePalaciosPlayer = await prisma.player.findFirst({
      where: {
        firstName: 'Joffre',
        lastName: 'Palacios'
      }
    });

    if (!juanTapiaPlayer || !joffrePalaciosPlayer) {
      console.error('❌ No se encontraron los jugadores');
      return;
    }

    console.log(`👤 Juan Tapia encontrado (ID: ${juanTapiaPlayer.id})`);
    console.log(`👤 Joffre Palacios encontrado (ID: ${joffrePalaciosPlayer.id})`);

    // 3. Encontrar sus eliminaciones actuales en fecha 9
    const juanTapiaElim = fecha9.eliminations.find(e => 
      e.eliminatedPlayerId === juanTapiaPlayer.id
    );
    const joffrePalaciosElim = fecha9.eliminations.find(e => 
      e.eliminatedPlayerId === joffrePalaciosPlayer.id
    );

    if (!juanTapiaElim || !joffrePalaciosElim) {
      console.error('❌ No se encontraron las eliminaciones');
      return;
    }

    console.log('\n🔍 ELIMINACIONES ACTUALES:');
    console.log(`Juan Tapia: Pos ${juanTapiaElim.position} (${juanTapiaElim.points} pts) - ID: ${juanTapiaElim.id}`);
    console.log(`Joffre Palacios: Pos ${joffrePalaciosElim.position} (${joffrePalaciosElim.points} pts) - ID: ${joffrePalaciosElim.id}`);

    // 4. Realizar correcciones
    console.log('\n🔧 CORRIGIENDO ELIMINACIONES...');
    
    // Juan Tapia: posición 5, 19 pts
    await prisma.elimination.update({
      where: { id: juanTapiaElim.id },
      data: {
        position: 5,
        points: 19
      }
    });
    console.log('✅ Juan Tapia corregido: Pos 5, 19 pts');

    // Joffre Palacios: posición 6, 18 pts  
    await prisma.elimination.update({
      where: { id: joffrePalaciosElim.id },
      data: {
        position: 6,
        points: 18
      }
    });
    console.log('✅ Joffre Palacios corregido: Pos 6, 18 pts');

    // 5. Verificar resultado
    console.log('\n🔍 VERIFICANDO RESULTADO...');
    const fecha9Updated = await prisma.gameDate.findUnique({
      where: { id: fecha9.id },
      include: {
        eliminations: {
          include: {
            eliminatedPlayer: true
          },
          orderBy: { position: 'desc' }
        }
      }
    });

    if (fecha9Updated) {
      const eliminacionesRegistrados = fecha9Updated.eliminations.filter(elim => {
        const nombre = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
        const registrados = [
          'Diego Behar', 'Javier Martinez', 'Jose Luis  Toral', 'Juan Antonio Cortez', 
          'Juan Fernando  Ochoa', 'Carlos Chacón', 'Damian Amador', 'Fernando Peña', 
          'Freddy Lopez', 'Joffre Palacios', 'Jorge Tamayo', 'Juan Tapia', 
          'Miguel Chiesa', 'Milton Tapia', 'Mono Benites', 'Roddy Naranjo', 
          'Ruben Cadena', 'Sean Willis', 'Daniel Vela'
        ];
        return registrados.includes(nombre);
      });

      console.log('\n📊 ELIMINACIONES FECHA 9 CORREGIDAS (SOLO REGISTRADOS):');
      console.log('| Pos | Jugador | Pts |');
      console.log('|-----|---------|-----|');
      
      eliminacionesRegistrados
        .sort((a, b) => a.position - b.position)
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

fixFecha9Positions();