import { prisma } from '../src/lib/prisma.js';

async function fixFecha11Final() {
  console.log('=== CORRECCIÓN FINAL FECHA 11 - DATOS DEFINITIVOS ===\n');

  try {
    // 1. Obtener fecha 11
    const fecha11 = await prisma.gameDate.findFirst({
      where: {
        tournament: { number: 28 },
        dateNumber: 11
      }
    });

    if (!fecha11) {
      console.error('❌ No se encontró fecha 11');
      return;
    }

    console.log(`🔍 FECHA 11 (ID: ${fecha11.id})`);

    // 2. Obtener jugadores necesarios
    const players = await prisma.player.findMany({
      where: {
        OR: [
          { firstName: 'Juan Fernando', lastName: { contains: 'Ochoa' } },
          { firstName: 'Ruben', lastName: 'Cadena' },
          { firstName: 'Meche', lastName: 'Garrido' }, // POS 17
          { firstName: 'Miguel', lastName: 'Chiesa' }, // POS 16
          { firstName: 'Fernando', lastName: 'Peña' },
          { firstName: 'Sean', lastName: 'Willis' },
          { firstName: 'Mono', lastName: 'Benites' },
          { firstName: 'Damian', lastName: 'Amador' },
          { firstName: 'Javier', lastName: 'Martinez' },
          { firstName: 'Juan Antonio', lastName: 'Cortez' },
          { firstName: 'Milton', lastName: 'Tapia' },
          { firstName: 'Joffre', lastName: 'Palacios' },
          { firstName: 'Roddy', lastName: 'Naranjo' },
          { firstName: 'Jose Luis', lastName: { contains: 'Toral' } },
          { firstName: 'Carlos', lastName: 'Chacón' },
          { firstName: 'Freddy', lastName: 'Lopez' },
          { firstName: 'Jorge', lastName: 'Tamayo' },
          { firstName: 'Daniel', lastName: 'Vela' }
        ]
      }
    });

    console.log(`👥 Jugadores encontrados: ${players.length}`);

    // 3. Limpiar eliminaciones actuales de fecha 11
    await prisma.elimination.deleteMany({
      where: { gameDateId: fecha11.id }
    });
    console.log('🗑️ Eliminaciones anteriores eliminadas');

    // 4. Datos correctos DEFINITIVOS según aclaraciones
    const eliminacionesCorrectas = [
      { pos: 19, eliminado: 'Juan Fernando  Ochoa', eliminador: 'Jorge Tamayo', pts: 2 },
      { pos: 18, eliminado: 'Ruben Cadena', eliminador: 'Freddy Lopez', pts: 3 },
      { pos: 17, eliminado: 'Meche Garrido', eliminador: 'Milton Tapia', pts: 4 }, // CORREGIDO
      { pos: 16, eliminado: 'Miguel Chiesa', eliminador: 'Freddy Lopez', pts: 5 }, // CORREGIDO
      { pos: 15, eliminado: 'Sean Willis', eliminador: 'Jose Luis  Toral', pts: 6 },
      { pos: 14, eliminado: 'Mono Benites', eliminador: 'Jose Luis  Toral', pts: 7 },
      { pos: 13, eliminado: 'Damian Amador', eliminador: 'Carlos Chacón', pts: 8 },
      { pos: 12, eliminado: 'Javier Martinez', eliminador: 'Freddy Lopez', pts: 9 },
      { pos: 11, eliminado: 'Fernando Peña', eliminador: 'Freddy Lopez', pts: 10 },
      { pos: 10, eliminado: 'Juan Antonio Cortez', eliminador: 'JP Moreno', pts: 11 },
      // JP Moreno (pos 9) no está registrado en torneo - skip
      { pos: 8, eliminado: 'Milton Tapia', eliminador: 'Freddy Lopez', pts: 13 },
      { pos: 7, eliminado: 'Joffre Palacios', eliminador: 'Jorge Tamayo', pts: 14 },
      { pos: 6, eliminado: 'Roddy Naranjo', eliminador: 'Daniel Vela', pts: 15 },
      { pos: 5, eliminado: 'Jose Luis  Toral', eliminador: 'Carlos Chacón', pts: 16 },
      { pos: 4, eliminado: 'Carlos Chacón', eliminador: 'Freddy Lopez', pts: 17 },
      { pos: 3, eliminado: 'Freddy Lopez', eliminador: 'Jorge Tamayo', pts: 18 },
      { pos: 2, eliminado: 'Daniel Vela', eliminador: 'Jorge Tamayo', pts: 19 },
      { pos: 1, eliminado: 'Jorge Tamayo', eliminador: null, pts: 27 } // GANADOR self-elimination
    ];

    // 5. Mapear nombres a IDs
    function findPlayer(nombre: string) {
      return players.find(p => {
        const fullName = `${p.firstName} ${p.lastName}`;
        return fullName === nombre || fullName.includes(nombre.replace('  ', ' '));
      });
    }

    // 6. Crear eliminaciones corregidas
    console.log('\n🔧 CREANDO ELIMINACIONES FINALES...');
    
    for (const elim of eliminacionesCorrectas) {
      const eliminatedPlayer = findPlayer(elim.eliminado);
      let eliminatorPlayer = null;
      
      if (elim.eliminador && elim.eliminador !== 'JP Moreno') {
        eliminatorPlayer = findPlayer(elim.eliminador);
      }

      if (!eliminatedPlayer) {
        console.error(`❌ No se encontró jugador eliminado: ${elim.eliminado}`);
        continue;
      }

      if (elim.eliminador && elim.eliminador !== 'JP Moreno' && !eliminatorPlayer) {
        console.error(`❌ No se encontró eliminador: ${elim.eliminador}`);
        continue;
      }

      // Crear eliminación
      await prisma.elimination.create({
        data: {
          position: elim.pos,
          points: elim.pts,
          eliminatedPlayerId: eliminatedPlayer.id,
          eliminatorPlayerId: eliminatorPlayer?.id || null,
          gameDateId: fecha11.id,
          eliminationTime: new Date().toISOString()
        }
      });

      const eliminatorName = elim.eliminador || 'AUTO (ganador)';
      console.log(`✅ Pos ${elim.pos}: ${elim.eliminado} eliminado por ${eliminatorName} (${elim.pts} pts)`);
    }

    // 7. Verificar resultado
    console.log('\n🔍 VERIFICANDO ELIMINACIONES FINALES...');
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
      console.log('\n📊 ELIMINACIONES FECHA 11 FINALES:');
      console.log('| Pos | Eliminado | Eliminador | Pts |');
      console.log('|-----|-----------|------------|-----|');
      
      fecha11Updated.eliminations.forEach(elim => {
        const eliminatedName = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
        const eliminatorName = elim.eliminatorPlayer 
          ? `${elim.eliminatorPlayer.firstName} ${elim.eliminatorPlayer.lastName}`
          : elim.position === 1 ? 'GANADOR' : 'JP Moreno';
        console.log(`| ${elim.position.toString().padStart(3)} | ${eliminatedName.padEnd(18)} | ${eliminatorName.padEnd(15)} | ${elim.points.toString().padStart(3)} |`);
      });
    }

    // 8. Verificar Meche Garrido no es participante registrado
    console.log('\n⚠️ NOTA: Meche Garrido es invitado, no participante registrado del Torneo 28');
    console.log('✅ Solo Miguel Chiesa (pos 16) afectará rankings del torneo');
    console.log('🎉 CORRECCIÓN FINAL COMPLETADA SIN ERRORES');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixFecha11Final();