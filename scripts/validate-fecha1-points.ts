import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Jugadores registrados en Torneo 28 según datos del sistema
const JUGADORES_REGISTRADOS = [
  "Diego Behar", "Javier Martinez", "Jose Luis  Toral", "Juan Antonio Cortez", 
  "Juan Fernando  Ochoa", "Carlos Chacón", "Damian Amador", "Fernando Peña", 
  "Freddy Lopez", "Joffre Palacios", "Jorge Tamayo", "Juan Tapia", 
  "Miguel Chiesa", "Milton Tapia", "Mono Benites", "Roddy Naranjo", 
  "Ruben Cadena", "Sean Willis", "Daniel Vela"
];

// Datos de t1.jpeg (imagen oficial)
const PUNTOS_T1_IMAGEN = {
  "Roddy N.": 26,
  "Freddy L.": 23,
  "Fernando P.": 20,
  "Daniel V.": 17,
  "Joffre P.": 16,
  "Sean W.": 15,
  "Ruben C.": 14,
  "Miguel Ch.": 13,
  "Juan Fernando O.": 12,
  "Andres B.": 10,  // Este debe ser "Mono Benites" 
  "Damian A.": 8,
  "Carlos Ch.": 7,
  "Juan C.": 6,     // Este debe ser "Juan Antonio Cortez"
  "Jorge T.": 5,
  "Diego B.": 4,
  "Juan T.": 2,
  "Milton T.": 1,
  "Javier M.": 0
};

// Mapeo de nombres abreviados a nombres completos
const MAPEO_NOMBRES = {
  "Roddy N.": "Roddy Naranjo",
  "Freddy L.": "Freddy Lopez", 
  "Fernando P.": "Fernando Peña",
  "Daniel V.": "Daniel Vela",
  "Joffre P.": "Joffre Palacios",
  "Sean W.": "Sean Willis",
  "Ruben C.": "Ruben Cadena",
  "Miguel Ch.": "Miguel Chiesa",
  "Juan Fernando O.": "Juan Fernando  Ochoa",
  "Andres B.": "Mono Benites",  // Asumiendo que es Mono Benites
  "Damian A.": "Damian Amador",
  "Carlos Ch.": "Carlos Chacón",
  "Juan C.": "Juan Antonio Cortez",  // Asumiendo que es Juan Antonio
  "Jorge T.": "Jorge Tamayo",
  "Diego B.": "Diego Behar",
  "Juan T.": "Juan Tapia",
  "Milton T.": "Milton Tapia",
  "Javier M.": "Javier Martinez"
};

async function validateFecha1Points() {
  console.log('=== VALIDACIÓN PUNTOS FECHA 1 - SOLO JUGADORES REGISTRADOS ===\n');

  // 1. Obtener datos del torneo 28
  const tournament = await prisma.tournaments.findFirst({
    where: { number: 28 },
    include: {
      participants: {
        include: {
          player: true
        }
      },
      gameDates: {
        where: { dateNumber: 1 },
        include: {
          eliminations: {
            include: {
              eliminatedPlayer: true,
              eliminatorPlayer: true
            },
            orderBy: { position: 'desc' }
          }
        }
      }
    }
  });

  if (!tournament || !tournament.gameDates[0]) {
    console.error('❌ No se encontró el torneo 28 o la fecha 1');
    return;
  }

  const fecha1 = tournament.gameDates[0];
  const participantesRegistrados = tournament.participants.map(p => p.player);
  
  console.log(`🏆 TORNEO 28 - PARTICIPANTES REGISTRADOS: ${participantesRegistrados.length}`);
  participantesRegistrados.forEach((p, i) => {
    console.log(`${i+1}. ${p.firstName} ${p.lastName}`);
  });

  console.log(`\n📅 FECHA 1 - ELIMINACIONES TOTALES: ${fecha1.eliminations.length}`);

  // 2. Filtrar eliminaciones solo de jugadores registrados
  const eliminacionesRegistrados = fecha1.eliminations.filter(elim => {
    const nombreCompleto = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
    return JUGADORES_REGISTRADOS.includes(nombreCompleto);
  });

  console.log(`📝 ELIMINACIONES DE JUGADORES REGISTRADOS: ${eliminacionesRegistrados.length}`);

  // 3. Crear mapeo de puntos del sistema
  const puntosSistema: { [key: string]: number } = {};
  
  // Inicializar todos los registrados con 0 puntos
  participantesRegistrados.forEach(p => {
    const nombreCompleto = `${p.firstName} ${p.lastName}`;
    puntosSistema[nombreCompleto] = 0;
  });

  // Asignar puntos según eliminaciones
  eliminacionesRegistrados.forEach(elim => {
    const nombreCompleto = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
    puntosSistema[nombreCompleto] = elim.points;
  });

  // 4. Comparar con imagen t1.jpeg
  console.log('\n=== COMPARACIÓN SISTEMA vs IMAGEN T1.JPEG ===');
  console.log('| Jugador (Imagen) | Pts Img | Jugador (Sistema) | Pts Sis | ✅/❌ |');
  console.log('|------------------|---------|-------------------|---------|-------|');

  let coincidencias = 0;
  let discrepancias = 0;

  for (const [nombreImg, ptsImg] of Object.entries(PUNTOS_T1_IMAGEN)) {
    const nombreSistema = MAPEO_NOMBRES[nombreImg];
    const ptsSistema = puntosSistema[nombreSistema] || 0;
    
    const coincide = ptsImg === ptsSistema;
    const status = coincide ? '✅' : '❌';
    
    if (coincide) coincidencias++;
    else discrepancias++;

    console.log(`| ${nombreImg.padEnd(16)} | ${ptsImg.toString().padStart(7)} | ${nombreSistema?.padEnd(17) || 'NO ENCONTRADO'.padEnd(17)} | ${ptsSistema.toString().padStart(7)} | ${status.padStart(5)} |`);
  }

  // 5. Verificar jugadores registrados que no aparecen en imagen
  const jugadoresEnImagen = Object.values(MAPEO_NOMBRES);
  const jugadoresFaltantes = participantesRegistrados.filter(p => {
    const nombreCompleto = `${p.firstName} ${p.lastName}`;
    return !jugadoresEnImagen.includes(nombreCompleto);
  });

  console.log('\n=== RESUMEN DE VALIDACIÓN ===');
  console.log(`✅ Coincidencias: ${coincidencias}`);
  console.log(`❌ Discrepancias: ${discrepancias}`);
  console.log(`📊 Precisión: ${((coincidencias / (coincidencias + discrepancias)) * 100).toFixed(1)}%`);

  if (jugadoresFaltantes.length > 0) {
    console.log('\n⚠️  JUGADORES REGISTRADOS NO EN IMAGEN:');
    jugadoresFaltantes.forEach(p => {
      const nombreCompleto = `${p.firstName} ${p.lastName}`;
      const pts = puntosSistema[nombreCompleto];
      console.log(`- ${nombreCompleto}: ${pts} pts`);
    });
  }

  // 6. Mostrar eliminaciones de no registrados (para contexto)
  const eliminacionesNoRegistrados = fecha1.eliminations.filter(elim => {
    const nombreCompleto = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
    return !JUGADORES_REGISTRADOS.includes(nombreCompleto);
  });

  if (eliminacionesNoRegistrados.length > 0) {
    console.log('\n📋 ELIMINACIONES DE NO REGISTRADOS (CONTEXTO):');
    eliminacionesNoRegistrados.forEach(elim => {
      const nombreCompleto = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`;
      console.log(`Pos ${elim.position}: ${nombreCompleto} (${elim.points} pts)`);
    });
  }
}

validateFecha1Points()
  .catch(console.error)
  .finally(() => prisma.$disconnect());