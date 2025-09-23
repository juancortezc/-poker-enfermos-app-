import { prisma } from '../src/lib/prisma.js';

async function validateFecha2() {
  console.log('=== VALIDACIÓN FECHA 2 EXACTA ===\n');

  try {
    // Obtener Tournament 28 con fechas 1 y 2
    const tournament28 = await prisma.tournament.findUnique({
      where: { number: 28 },
      include: {
        tournamentParticipants: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true
              }
            }
          }
        },
        gameDates: {
          where: {
            dateNumber: { in: [1, 2] }
          },
          include: {
            eliminations: {
              include: {
                eliminatedPlayer: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                },
                eliminatorPlayer: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: { position: 'desc' }
            }
          },
          orderBy: { dateNumber: 'asc' }
        }
      }
    });

    if (!tournament28) {
      console.error('❌ No se encontró Tournament 28');
      return;
    }

    const participantNames = tournament28.tournamentParticipants.map(tp => 
      `${tp.player.firstName} ${tp.player.lastName}`
    );

    console.log(`🏆 PARTICIPANTES REGISTRADOS: ${participantNames.length}`);

    const fecha1 = tournament28.gameDates.find(gd => gd.dateNumber === 1);
    const fecha2 = tournament28.gameDates.find(gd => gd.dateNumber === 2);

    if (!fecha1 || !fecha2) {
      console.error('❌ No se encontraron las fechas 1 o 2');
      return;
    }

    // Procesar puntos por jugador
    const puntosPorJugador: { [key: string]: { fecha1: number, fecha2: number, total: number } } = {};

    // Inicializar todos los registrados
    participantNames.forEach(nombre => {
      puntosPorJugador[nombre] = { fecha1: 0, fecha2: 0, total: 0 };
    });

    // Procesar fecha 1 (solo registrados)
    fecha1.eliminations.forEach(elim => {
      const nombre = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
      if (participantNames.includes(nombre)) {
        puntosPorJugador[nombre].fecha1 = elim.points;
      }
    });

    // Procesar fecha 2 (solo registrados)
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

    console.log('\n📊 DATOS SISTEMA - FECHAS 1 Y 2 (SOLO REGISTRADOS):');
    console.log('| Jugador | F1 | F2 | Total |');
    console.log('|---------|----|----|-------|');

    // Ordenar por total descendente para coincidir con imagen
    Object.entries(puntosPorJugador)
      .sort(([,a], [,b]) => b.total - a.total)
      .forEach(([nombre, puntos]) => {
        console.log(`| ${nombre.padEnd(22)} | ${puntos.fecha1.toString().padStart(2)} | ${puntos.fecha2.toString().padStart(2)} | ${puntos.total.toString().padStart(5)} |`);
      });

    console.log('\n🔥 ELIMINACIONES FECHA 2 DETALLADAS:');
    const eliminacionesFecha2Registrados = fecha2.eliminations.filter(elim => {
      const nombre = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
      return participantNames.includes(nombre);
    });

    eliminacionesFecha2Registrados.forEach(elim => {
      const eliminatedName = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
      console.log(`Pos ${elim.position}: ${eliminatedName} (${elim.points} pts)`);
    });

    return puntosPorJugador;

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

validateFecha2();