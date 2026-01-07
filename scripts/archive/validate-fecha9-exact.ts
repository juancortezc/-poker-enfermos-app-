import { prisma } from '../src/lib/prisma.js';

async function validateFecha9() {
  console.log('=== VALIDACIÓN FECHA 9 EXACTA ===\n');

  try {
    // Obtener Tournament 28 con fechas 1-9
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
            dateNumber: { in: [1, 2, 3, 4, 5, 6, 7, 8, 9] }
          },
          include: {
            eliminations: {
              include: {
                eliminatedPlayer: {
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

    const fechas = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => 
      tournament28.gameDates.find(gd => gd.dateNumber === num)
    );

    if (fechas.some(fecha => !fecha)) {
      console.error('❌ No se encontraron todas las fechas 1-9');
      return;
    }

    // Procesar puntos por jugador
    const puntosPorJugador: { [key: string]: { fecha1: number, fecha2: number, fecha3: number, fecha4: number, fecha5: number, fecha6: number, fecha7: number, fecha8: number, fecha9: number, total: number } } = {};

    // Inicializar todos los registrados
    participantNames.forEach(nombre => {
      puntosPorJugador[nombre] = { fecha1: 0, fecha2: 0, fecha3: 0, fecha4: 0, fecha5: 0, fecha6: 0, fecha7: 0, fecha8: 0, fecha9: 0, total: 0 };
    });

    // Procesar cada fecha (solo registrados)
    fechas.forEach((fecha, index) => {
      if (fecha) {
        const fechaKey = `fecha${index + 1}` as keyof typeof puntosPorJugador[string];
        fecha.eliminations.forEach(elim => {
          const nombre = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
          if (participantNames.includes(nombre)) {
            puntosPorJugador[nombre][fechaKey] = elim.points;
          }
        });
      }
    });

    // Calcular totales
    Object.keys(puntosPorJugador).forEach(nombre => {
      const jugador = puntosPorJugador[nombre];
      jugador.total = jugador.fecha1 + jugador.fecha2 + jugador.fecha3 + jugador.fecha4 + jugador.fecha5 + jugador.fecha6 + jugador.fecha7 + jugador.fecha8 + jugador.fecha9;
    });

    console.log('\n📊 DATOS SISTEMA - FECHAS 1-9 (SOLO REGISTRADOS):');
    console.log('| Jugador | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 | F9 | Total |');
    console.log('|---------|----|----|----|----|----|----|----|----|----|----|');

    // Ordenar por total descendente
    Object.entries(puntosPorJugador)
      .sort(([,a], [,b]) => b.total - a.total)
      .forEach(([nombre, puntos]) => {
        console.log(`| ${nombre.padEnd(22)} | ${puntos.fecha1.toString().padStart(2)} | ${puntos.fecha2.toString().padStart(2)} | ${puntos.fecha3.toString().padStart(2)} | ${puntos.fecha4.toString().padStart(2)} | ${puntos.fecha5.toString().padStart(2)} | ${puntos.fecha6.toString().padStart(2)} | ${puntos.fecha7.toString().padStart(2)} | ${puntos.fecha8.toString().padStart(2)} | ${puntos.fecha9.toString().padStart(2)} | ${puntos.total.toString().padStart(5)} |`);
      });

    console.log('\n🔥 ELIMINACIONES FECHA 9 DETALLADAS:');
    const fecha9 = fechas[8];
    if (fecha9) {
      const eliminacionesFecha9Registrados = fecha9.eliminations.filter(elim => {
        const nombre = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
        return participantNames.includes(nombre);
      });

      eliminacionesFecha9Registrados.forEach(elim => {
        const eliminatedName = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
        console.log(`Pos ${elim.position}: ${eliminatedName} (${elim.points} pts)`);
      });
    }

    return puntosPorJugador;

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

validateFecha9();