import { prisma } from '../src/lib/prisma.js';

async function analyzeTournament28() {
  console.log('=== ANÁLISIS ESTADO ACTUAL TORNEO 28 ===\n');

  try {
    // 1. Obtener Tournament 28 con todos sus datos relacionados
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
          include: {
            eliminations: {
              include: {
                eliminatedPlayer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                },
                eliminatorPlayer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: {
                position: 'desc'
              }
            },
            timerStates: true
          },
          orderBy: {
            dateNumber: 'asc'
          }
        },
        tournamentRankings: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!tournament28) {
      console.log('❌ Tournament 28 no encontrado');
      return;
    }

    console.log('🏆 TOURNAMENT 28 INFO:');
    console.log(`ID: ${tournament28.id}`);
    console.log(`Status: ${tournament28.status}`);
    console.log(`Participantes registrados: ${tournament28.tournamentParticipants.length}`);
    console.log(`Fechas creadas: ${tournament28.gameDates.length}`);
    console.log(`Rankings existentes: ${tournament28.tournamentRankings.length}\n`);

    // 2. Analizar participantes registrados
    console.log('👥 PARTICIPANTES REGISTRADOS:');
    tournament28.tournamentParticipants.forEach((tp, index) => {
      const player = tp.player;
      console.log(`${index + 1}. ${player.firstName} ${player.lastName} (${player.role}) - ID: ${player.id}`);
    });

    // 3. Analizar Fecha 1 específicamente
    const fecha1 = tournament28.gameDates.find(gd => gd.dateNumber === 1);
    if (fecha1) {
      console.log('\n📅 FECHA 1 ANÁLISIS:');
      console.log(`Status: ${fecha1.status}`);
      console.log(`Scheduled Date: ${fecha1.scheduledDate}`);
      console.log(`Start Time: ${fecha1.startTime}`);
      console.log(`Player IDs: ${fecha1.playerIds.length} jugadores`);
      console.log(`Eliminaciones: ${fecha1.eliminations.length}`);
      console.log(`Timer States: ${fecha1.timerStates.length}`);

      if (fecha1.eliminations.length > 0) {
        console.log('\n🔥 ELIMINACIONES ACTUALES (POSIBLEMENTE INCORRECTAS):');
        fecha1.eliminations.forEach(elim => {
          const eliminated = elim.eliminatedPlayer;
          const eliminator = elim.eliminatorPlayer;
          console.log(`Pos ${elim.position}: ${eliminated.firstName} ${eliminated.lastName} (${elim.points} pts) - Eliminado por: ${eliminator.firstName} ${eliminator.lastName}`);
        });
      }

      if (fecha1.timerStates.length > 0) {
        console.log('\n⏱️ TIMER STATES:');
        fecha1.timerStates.forEach(timer => {
          console.log(`Status: ${timer.status}, Level: ${timer.currentLevel}, Time: ${timer.timeRemaining}`);
        });
      }
    }

    // 4. Analizar otras fechas
    console.log('\n📅 OTRAS FECHAS:');
    tournament28.gameDates.forEach(gd => {
      if (gd.dateNumber !== 1) {
        console.log(`Fecha ${gd.dateNumber}: ${gd.status} - ${gd.scheduledDate.toISOString().split('T')[0]} - ${gd.eliminations.length} eliminaciones`);
      }
    });

    // 5. Listar todos los jugadores para mapeo
    console.log('\n👨‍💼 TODOS LOS JUGADORES EN LA DB (para mapeo):');
    const allPlayers = await prisma.player.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    allPlayers.forEach((player, index) => {
      console.log(`${index + 1}. "${player.firstName} ${player.lastName}" - ${player.role} - ID: ${player.id}`);
    });

  } catch (error) {
    console.error('❌ Error analizando Tournament 28:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeTournament28();