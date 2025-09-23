import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({ log: ['query'] })

async function getFecha2Data() {
  console.log('=== DATOS FECHA 2 - SISTEMA ===\n');

  try {
    // Obtener torneo 28
    const tournament = await prisma.tournaments.findFirst({
      where: { number: 28 },
      include: {
        participants: {
          include: { player: true }
        },
        gameDates: {
          where: { dateNumber: { in: [1, 2] } },
          include: {
            eliminations: {
              include: {
                eliminatedPlayer: true,
                eliminatorPlayer: true
              },
              orderBy: { position: 'desc' }
            }
          },
          orderBy: { dateNumber: 'asc' }
        }
      }
    });

    if (!tournament) {
      console.error('❌ No se encontró el torneo 28');
      return;
    }

    const participantNames = tournament.participants.map(p => 
      `${p.player.firstName} ${p.player.lastName}`
    );

    const fecha1 = tournament.gameDates.find(gd => gd.dateNumber === 1);
    const fecha2 = tournament.gameDates.find(gd => gd.dateNumber === 2);

    if (!fecha1 || !fecha2) {
      console.error('❌ No se encontraron las fechas 1 o 2');
      return;
    }

    // Procesar eliminaciones registradas
    const puntosPorJugador: { [key: string]: { fecha1: number, fecha2: number, total: number } } = {};

    // Inicializar
    participantNames.forEach(nombre => {
      puntosPorJugador[nombre] = { fecha1: 0, fecha2: 0, total: 0 };
    });

    // Fecha 1
    fecha1.eliminations.forEach(elim => {
      const nombre = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
      if (participantNames.includes(nombre)) {
        puntosPorJugador[nombre].fecha1 = elim.points;
      }
    });

    // Fecha 2
    fecha2.eliminations.forEach(elim => {
      const nombre = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
      if (participantNames.includes(nombre)) {
        puntosPorJugador[nombre].fecha2 = elim.points;
      }
    });

    // Calcular totales
    Object.keys(puntosPorJugador).forEach(nombre => {
      puntosPorJugador[nombre].total = puntosPorJugador[nombre].fecha1 + puntosPorJugador[nombre].fecha2;
    });

    // Mostrar solo quienes tienen puntos en fecha 2
    console.log('📊 JUGADORES CON PUNTOS EN FECHA 2:');
    console.log('| Jugador | F1 | F2 | Total |');
    console.log('|---------|----|----|-------|');

    Object.entries(puntosPorJugador)
      .filter(([, puntos]) => puntos.fecha2 > 0)
      .sort(([,a], [,b]) => b.fecha2 - a.fecha2)
      .forEach(([nombre, puntos]) => {
        console.log(`| ${nombre.padEnd(20)} | ${puntos.fecha1.toString().padStart(2)} | ${puntos.fecha2.toString().padStart(2)} | ${puntos.total.toString().padStart(5)} |`);
      });

    console.log('\n📊 TODOS LOS REGISTRADOS (ordenados por total):');
    console.log('| Jugador | F1 | F2 | Total |');
    console.log('|---------|----|----|-------|');

    Object.entries(puntosPorJugador)
      .sort(([,a], [,b]) => b.total - a.total)
      .forEach(([nombre, puntos]) => {
        console.log(`| ${nombre.padEnd(20)} | ${puntos.fecha1.toString().padStart(2)} | ${puntos.fecha2.toString().padStart(2)} | ${puntos.total.toString().padStart(5)} |`);
      });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getFecha2Data();