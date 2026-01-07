import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getFecha2Data() {
  console.log('=== DATOS FECHA 2 - JUGADORES REGISTRADOS ===\n');

  // Obtener torneo 28 con fechas 1 y 2
  const tournament = await prisma.tournaments.findFirst({
    where: { number: 28 },
    include: {
      participants: {
        include: {
          player: true
        }
      },
      gameDates: {
        where: { 
          OR: [
            { dateNumber: 1 },
            { dateNumber: 2 }
          ]
        },
        include: {
          eliminations: {
            include: {
              eliminatedPlayer: true
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

  const participantesRegistrados = tournament.participants.map(p => 
    `${p.player.firstName} ${p.player.lastName}`
  );

  const fecha1 = tournament.gameDates.find(gd => gd.dateNumber === 1);
  const fecha2 = tournament.gameDates.find(gd => gd.dateNumber === 2);

  if (!fecha1 || !fecha2) {
    console.error('❌ No se encontraron las fechas 1 o 2');
    return;
  }

  // Calcular puntos por jugador
  const puntosPorJugador: { [key: string]: { fecha1: number, fecha2: number, total: number } } = {};

  // Inicializar todos los registrados
  participantesRegistrados.forEach(nombre => {
    puntosPorJugador[nombre] = { fecha1: 0, fecha2: 0, total: 0 };
  });

  // Puntos fecha 1
  fecha1.eliminations.forEach(elim => {
    const nombre = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
    if (participantesRegistrados.includes(nombre)) {
      puntosPorJugador[nombre].fecha1 = elim.points;
    }
  });

  // Puntos fecha 2
  fecha2.eliminations.forEach(elim => {
    const nombre = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
    if (participantesRegistrados.includes(nombre)) {
      puntosPorJugador[nombre].fecha2 = elim.points;
    }
  });

  // Calcular totales
  Object.keys(puntosPorJugador).forEach(nombre => {
    puntosPorJugador[nombre].total = puntosPorJugador[nombre].fecha1 + puntosPorJugador[nombre].fecha2;
  });

  // Ordenar por total descendente
  const jugadoresOrdenados = Object.entries(puntosPorJugador)
    .sort(([,a], [,b]) => b.total - a.total);

  console.log('📊 PUNTOS POR JUGADOR - FECHAS 1 Y 2:');
  console.log('| Pos | Jugador | F1 | F2 | Total |');
  console.log('|-----|---------|----|----|-------|');
  
  jugadoresOrdenados.forEach(([nombre, puntos], index) => {
    if (puntos.total > 0) { // Solo mostrar quienes participaron
      console.log(`| ${(index + 1).toString().padStart(3)} | ${nombre.padEnd(20)} | ${puntos.fecha1.toString().padStart(2)} | ${puntos.fecha2.toString().padStart(2)} | ${puntos.total.toString().padStart(5)} |`);
    }
  });

  return puntosPorJugador;
}

getFecha2Data()
  .catch(console.error)
  .finally(() => prisma.$disconnect());