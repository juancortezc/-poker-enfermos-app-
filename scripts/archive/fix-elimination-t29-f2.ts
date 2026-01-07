import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixElimination() {
  try {
    // 1. Buscar la fecha 2 del Torneo 29
    const gameDate = await prisma.gameDate.findFirst({
      where: {
        tournament: {
          number: 29
        },
        dateNumber: 2
      },
      include: {
        tournament: true
      }
    });

    if (!gameDate) {
      console.error('❌ No se encontró la fecha 2 del Torneo 29');
      return;
    }

    console.log(`✅ Fecha encontrada: ${gameDate.tournament.name} - Fecha ${gameDate.dateNumber}`);
    console.log(`   ID: ${gameDate.id}`);

    // 2. Buscar los jugadores involucrados
    const [juanAntonio, diegoBehar, roddyNaranjo] = await Promise.all([
      prisma.player.findFirst({
        where: {
          firstName: { contains: 'Juan Antonio', mode: 'insensitive' },
          lastName: { contains: 'Cortez', mode: 'insensitive' }
        }
      }),
      prisma.player.findFirst({
        where: {
          firstName: { contains: 'Diego', mode: 'insensitive' },
          lastName: { contains: 'Behar', mode: 'insensitive' }
        }
      }),
      prisma.player.findFirst({
        where: {
          firstName: { contains: 'Roddy', mode: 'insensitive' }
        }
      })
    ]);

    if (!juanAntonio || !diegoBehar || !roddyNaranjo) {
      console.error('❌ No se encontraron todos los jugadores');
      console.log('Juan Antonio:', juanAntonio ? `${juanAntonio.firstName} ${juanAntonio.lastName}` : 'No encontrado');
      console.log('Diego Behar:', diegoBehar ? `${diegoBehar.firstName} ${diegoBehar.lastName}` : 'No encontrado');
      console.log('Roddy Naranjo:', roddyNaranjo ? `${roddyNaranjo.firstName} ${roddyNaranjo.lastName}` : 'No encontrado');
      return;
    }

    console.log('\n📋 Jugadores encontrados:');
    console.log(`   Eliminado: ${juanAntonio.firstName} ${juanAntonio.lastName} (ID: ${juanAntonio.id})`);
    console.log(`   Eliminador correcto: ${diegoBehar.firstName} ${diegoBehar.lastName} (ID: ${diegoBehar.id})`);
    console.log(`   Eliminador incorrecto: ${roddyNaranjo.firstName} ${roddyNaranjo.lastName} (ID: ${roddyNaranjo.id})`);

    // 3. Buscar la eliminación incorrecta en posición 18
    const elimination = await prisma.elimination.findFirst({
      where: {
        gameDateId: gameDate.id,
        eliminatedPlayerId: juanAntonio.id,
        position: 18
      },
      include: {
        eliminatedPlayer: true,
        eliminatorPlayer: true
      }
    });

    if (!elimination) {
      console.error('\n❌ No se encontró la eliminación en posición 18');
      return;
    }

    console.log('\n🔍 Eliminación encontrada:');
    console.log(`   ID: ${elimination.id}`);
    console.log(`   Posición: ${elimination.position}`);
    console.log(`   Eliminado: ${elimination.eliminatedPlayer.firstName} ${elimination.eliminatedPlayer.lastName}`);
    console.log(`   Eliminador actual: ${elimination.eliminatorPlayer ? `${elimination.eliminatorPlayer.firstName} ${elimination.eliminatorPlayer.lastName}` : 'N/A'}`);
    console.log(`   Puntos: ${elimination.points}`);

    // 4. Verificar si el eliminador actual es incorrecto
    if (elimination.eliminatorPlayerId === roddyNaranjo.id) {
      console.log('\n✏️  Corrigiendo eliminador...');

      const updated = await prisma.elimination.update({
        where: { id: elimination.id },
        data: {
          eliminatorPlayerId: diegoBehar.id
        },
        include: {
          eliminatedPlayer: true,
          eliminatorPlayer: true
        }
      });

      console.log('\n✅ Eliminación corregida exitosamente:');
      console.log(`   Posición: ${updated.position}`);
      console.log(`   Eliminado: ${updated.eliminatedPlayer.firstName} ${updated.eliminatedPlayer.lastName}`);
      console.log(`   Eliminador: ${updated.eliminatorPlayer ? `${updated.eliminatorPlayer.firstName} ${updated.eliminatorPlayer.lastName}` : 'N/A'}`);
      console.log(`   Puntos: ${updated.points}`);
    } else if (elimination.eliminatorPlayerId === diegoBehar.id) {
      console.log('\n✅ La eliminación ya tiene el eliminador correcto (Diego Behar)');
    } else {
      console.log(`\n⚠️  El eliminador actual es: ${elimination.eliminatorPlayer ? `${elimination.eliminatorPlayer.firstName} ${elimination.eliminatorPlayer.lastName}` : 'N/A'}`);
      console.log('   ¿Desea cambiarlo a Diego Behar? (ejecutar el script para confirmar)');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixElimination();
