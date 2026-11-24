import { prisma } from '../src/lib/prisma.js';

async function fixFecha11Simple() {
  console.log('=== CORRECCIÓN SIMPLE FECHA 11 ===\n');

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

    // 2. Limpiar eliminaciones actuales
    await prisma.elimination.deleteMany({
      where: { gameDateId: fecha11.id }
    });
    console.log('🗑️ Eliminaciones anteriores eliminadas');

    // 3. Datos definitivos con IDs conocidos
    const eliminaciones = [
      // Solo registrados del torneo (skip Meche Garrido pos 17, JP Moreno pos 9)
      { pos: 19, playerId: 'cmfbl1abh000pp8dbtb7gbx1f', eliminatorId: 'cmfbl19s2000dp8dbyogiettf', pts: 2 }, // Juan Fernando Ochoa -> Jorge Tamayo
      { pos: 18, playerId: 'cmfbl1a05000jp8dbvv09hppc', eliminatorId: 'cmfbl19j30009p8dbppitimmz', pts: 3 }, // Ruben Cadena -> Freddy Lopez
      { pos: 16, playerId: 'cmfbl1ae6000rp8dbj5erik9j', eliminatorId: 'cmfbl19j30009p8dbppitimmz', pts: 5 }, // Miguel Chiesa -> Freddy Lopez
      { pos: 15, playerId: 'cmfbl1ajk000vp8dbzfs1govt', eliminatorId: 'cmfbl1bg8001bp8db63ct0xsu', pts: 6 }, // Sean Willis -> Jose Luis Toral
      { pos: 14, playerId: 'cmfbl19uq000fp8dbnvdeekj6', eliminatorId: 'cmfbl1bg8001bp8db63ct0xsu', pts: 7 }, // Mono Benites -> Jose Luis Toral
      { pos: 13, playerId: 'cmfbl1a2t000lp8dbfxf99gyb', eliminatorId: 'cmfbl19xg000hp8dbmfmgx4kt', pts: 8 }, // Damian Amador -> Carlos Chacón
      { pos: 12, playerId: 'cmfbl1axu0013p8dbz8lt3c9u', eliminatorId: 'cmfbl19j30009p8dbppitimmz', pts: 9 }, // Javier Martinez -> Freddy Lopez
      { pos: 11, playerId: 'cmfbl1ama000xp8dblmchx37p', eliminatorId: 'cmfbl19j30009p8dbppitimmz', pts: 10 }, // Fernando Peña -> Freddy Lopez
      { pos: 10, playerId: 'cmfbl1c0w001lp8dbef0p6on3', eliminatorId: 'cmfvjlxva0000p8fm86fs09ml', pts: 11 }, // Juan Antonio Cortez -> JP Moreno
      { pos: 8, playerId: 'cmfbl19b10003p8db4jdy8zri', eliminatorId: 'cmfbl19j30009p8dbppitimmz', pts: 13 }, // Milton Tapia -> Freddy Lopez
      { pos: 7, playerId: 'cmfbl1a5j000np8dbpesoje76', eliminatorId: 'cmfbl19s2000dp8dbyogiettf', pts: 14 }, // Joffre Palacios -> Jorge Tamayo
      { pos: 6, playerId: 'cmfbl195n0001p8dbwge7v0a6', eliminatorId: 'cmfbl1agu000tp8dbbyqfrghw', pts: 15 }, // Roddy Naranjo -> Daniel Vela
      { pos: 5, playerId: 'cmfbl1bg8001bp8db63ct0xsu', eliminatorId: 'cmfbl19xg000hp8dbmfmgx4kt', pts: 16 }, // Jose Luis Toral -> Carlos Chacón
      { pos: 4, playerId: 'cmfbl19xg000hp8dbmfmgx4kt', eliminatorId: 'cmfbl19j30009p8dbppitimmz', pts: 17 }, // Carlos Chacón -> Freddy Lopez
      { pos: 3, playerId: 'cmfbl19j30009p8dbppitimmz', eliminatorId: 'cmfbl19s2000dp8dbyogiettf', pts: 18 }, // Freddy Lopez -> Jorge Tamayo
      { pos: 2, playerId: 'cmfbl1agu000tp8dbbyqfrghw', eliminatorId: 'cmfbl19s2000dp8dbyogiettf', pts: 19 }, // Daniel Vela -> Jorge Tamayo
      { pos: 1, playerId: 'cmfbl19s2000dp8dbyogiettf', eliminatorId: 'cmfbl19s2000dp8dbyogiettf', pts: 27 } // Jorge Tamayo -> GANADOR (self)
    ];

    // 4. Crear eliminaciones
    console.log('🔧 CREANDO ELIMINACIONES...');
    
    for (const elim of eliminaciones) {
      await prisma.elimination.create({
        data: {
          position: elim.pos,
          points: elim.pts,
          eliminatedPlayerId: elim.playerId,
          eliminatorPlayerId: elim.eliminatorId,
          gameDateId: fecha11.id,
          eliminationTime: new Date().toISOString()
        }
      });
      console.log(`✅ Pos ${elim.pos}: ${elim.pts} pts`);
    }

    console.log('\n🎉 FECHA 11 CORREGIDA EXITOSAMENTE');
    console.log('📝 Total eliminaciones creadas:', eliminaciones.length);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixFecha11Simple();