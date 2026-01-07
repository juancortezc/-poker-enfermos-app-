import { prisma } from '../src/lib/prisma.js';

async function fixFecha2Simple() {
  console.log('=== CORRIGIENDO DUPLICADO FECHA 2 ===\n');

  try {
    // La eliminación ID 44 es la incorrecta (Jose Luis en posición 6)
    // Debe eliminarse porque Jose Luis ya está correctamente en posición 13 con 11 pts
    
    console.log('🔍 ELIMINACIÓN A CORREGIR:');
    const eliminacionIncorrecta = await prisma.elimination.findUnique({
      where: { id: 44 },
      include: {
        eliminatedPlayer: true
      }
    });

    if (eliminacionIncorrecta) {
      console.log(`ID ${eliminacionIncorrecta.id}: ${eliminacionIncorrecta.eliminatedPlayer.firstName} ${eliminacionIncorrecta.eliminatedPlayer.lastName} - Pos ${eliminacionIncorrecta.position} (${eliminacionIncorrecta.points} pts)`);
      
      console.log('\n🗑️ ELIMINANDO REGISTRO DUPLICADO...');
      await prisma.elimination.delete({
        where: { id: 44 }
      });
      
      console.log('✅ Eliminación duplicada removida');
    } else {
      console.log('❌ No se encontró la eliminación ID 44');
    }

    // Verificar resultado
    console.log('\n🔍 VERIFICANDO RESULTADO...');
    const fecha2 = await prisma.gameDate.findFirst({
      where: {
        tournament: { number: 28 },
        dateNumber: 2
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

    if (fecha2) {
      const eliminacionesRegistrados = fecha2.eliminations.filter(elim => {
        const nombre = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
        return !['Apolinar Externo', 'Invitado SN', 'Agustin Guerrero', 'Jose Patricio  Moreno', 'Meche Garrido'].includes(nombre);
      });

      console.log('📊 ELIMINACIONES CORREGIDAS (SOLO REGISTRADOS):');
      console.log('| Pos | Jugador | Pts |');
      console.log('|-----|---------|-----|');
      
      eliminacionesRegistrados.forEach(elim => {
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

fixFecha2Simple();