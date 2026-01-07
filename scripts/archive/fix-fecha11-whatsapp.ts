import { prisma } from '../src/lib/prisma.js';

async function fixFecha11WhatsApp() {
  console.log('=== CORRIGIENDO FECHA 11 CON DATOS WHATSAPP ===\n');

  try {
    // 1. Obtener fecha 11
    const fecha11 = await prisma.gameDate.findFirst({
      where: {
        tournament: { number: 28 },
        dateNumber: 11
      },
      include: {
        eliminations: {
          include: {
            eliminatedPlayer: true
          }
        }
      }
    });

    if (!fecha11) {
      console.error('❌ No se encontró fecha 11');
      return;
    }

    console.log(`🔍 FECHA 11 (ID: ${fecha11.id}) - ELIMINACIONES ACTUALES: ${fecha11.eliminations.length}`);

    // 2. Obtener jugadores necesarios
    const players = await prisma.player.findMany({
      where: {
        OR: [
          { firstName: 'Juan Fernando', lastName: { contains: 'Ochoa' } },
          { firstName: 'Ruben', lastName: 'Cadena' },
          { firstName: 'Miguel', lastName: 'Chiesa' },
          { firstName: 'Fernando', lastName: 'Peña' },
          { firstName: 'Sean', lastName: 'Willis' },
          { firstName: 'Mono', lastName: 'Benites' },
          { firstName: 'Damian', lastName: 'Amador' },
          { firstName: 'Javier', lastName: 'Martinez' },
          { firstName: 'Juan Antonio', lastName: 'Cortez' },
          { firstName: 'Jorge', lastName: 'Tamayo' },
          { firstName: 'Freddy', lastName: 'Lopez' },
          { firstName: 'Carlos', lastName: 'Chacón' },
          { firstName: 'Jose Luis', lastName: { contains: 'Toral' } },
          { firstName: 'Milton', lastName: 'Tapia' }
        ]
      }
    });

    console.log(`👥 Jugadores encontrados: ${players.length}`);
    players.forEach(p => console.log(`  - ${p.firstName} ${p.lastName} (ID: ${p.id})`));

    // 3. Limpiar eliminaciones actuales de fecha 11
    await prisma.elimination.deleteMany({
      where: { gameDateId: fecha11.id }
    });
    console.log('🗑️ Eliminaciones anteriores eliminadas');

    // 4. Datos correctos según WhatsApp CORREGIDOS (posiciones 19-10, falta 1-9)
    const eliminacionesCorrectas = [
      { pos: 19, eliminado: 'Juan Fernando  Ochoa', eliminador: 'Jorge Tamayo', pts: 2 },
      { pos: 18, eliminado: 'Ruben Cadena', eliminador: 'Freddy Lopez', pts: 3 },
      { pos: 17, eliminado: 'Miguel Chiesa', eliminador: 'Milton Tapia', pts: 4 },
      { pos: 16, eliminado: 'Miguel Chiesa', eliminador: 'Freddy Lopez', pts: 5 }, // CORREGIDO: Miguel pos 16
      { pos: 15, eliminado: 'Sean Willis', eliminador: 'Jose Luis  Toral', pts: 6 },
      { pos: 14, eliminado: 'Mono Benites', eliminador: 'Jose Luis  Toral', pts: 7 },
      { pos: 13, eliminado: 'Damian Amador', eliminador: 'Carlos Chacón', pts: 8 },
      { pos: 12, eliminado: 'Javier Martinez', eliminador: 'Freddy Lopez', pts: 9 },
      { pos: 11, eliminado: 'Fernando Peña', eliminador: 'Freddy Lopez', pts: 10 }, // CORREGIDO: Fernando pos 11
      { pos: 10, eliminado: 'Juan Antonio Cortez', eliminador: 'Jose Patricio Moreno', pts: 11 }
    ];

    // 5. Mapear nombres a IDs
    function findPlayer(nombre: string) {
      return players.find(p => {
        const fullName = `${p.firstName} ${p.lastName}`;
        return fullName === nombre || fullName.includes(nombre.replace('  ', ' '));
      });
    }

    // 6. Crear eliminaciones corregidas
    console.log('\n🔧 CREANDO ELIMINACIONES CORREGIDAS...');
    
    for (const elim of eliminacionesCorrectas) {
      const eliminatedPlayer = findPlayer(elim.eliminado);
      let eliminatorPlayer = null;
      
      if (elim.eliminador !== 'Jose Patricio Moreno') {
        eliminatorPlayer = findPlayer(elim.eliminador);
      }

      if (!eliminatedPlayer) {
        console.error(`❌ No se encontró jugador eliminado: ${elim.eliminado}`);
        continue;
      }

      if (elim.eliminador !== 'Jose Patricio Moreno' && !eliminatorPlayer) {
        console.error(`❌ No se encontró eliminador: ${elim.eliminador}`);
        continue;
      }

      await prisma.elimination.create({
        data: {
          position: elim.pos,
          points: elim.pts,
          eliminatedPlayerId: eliminatedPlayer.id,
          eliminatorPlayerId: eliminatorPlayer?.id || null,
          gameDateId: fecha11.id,
          eliminationTime: new Date()
        }
      });

      console.log(`✅ Pos ${elim.pos}: ${elim.eliminado} eliminado por ${elim.eliminador} (${elim.pts} pts)`);
    }

    // 7. Verificar resultado
    console.log('\n🔍 VERIFICANDO ELIMINACIONES CORREGIDAS...');
    const fecha11Updated = await prisma.gameDate.findUnique({
      where: { id: fecha11.id },
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

    if (fecha11Updated) {
      console.log('\n📊 ELIMINACIONES FECHA 11 CORREGIDAS:');
      console.log('| Pos | Eliminado | Eliminador | Pts |');
      console.log('|-----|-----------|------------|-----|');
      
      fecha11Updated.eliminations.forEach(elim => {
        const eliminatedName = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
        const eliminatorName = elim.eliminatorPlayer 
          ? `${elim.eliminatorPlayer.firstName} ${elim.eliminatorPlayer.lastName}`
          : 'JP Moreno (invitado)';
        console.log(`| ${elim.position.toString().padStart(3)} | ${eliminatedName.padEnd(18)} | ${eliminatorName.padEnd(15)} | ${elim.points.toString().padStart(3)} |`);
      });
    }

    console.log('\n⚠️ NOTA: Solo se corrigieron posiciones 19-10. Faltan posiciones 9-1 (ganador)');
    console.log('🎉 CORRECCIÓN PARCIAL COMPLETADA');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixFecha11WhatsApp();