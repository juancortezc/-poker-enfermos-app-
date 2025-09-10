import { prisma } from '../src/lib/prisma.js';

// Mapeo de nombres CSV → Database
export const PLAYER_NAME_MAPPING: Record<string, string> = {
  // Nombres exactos que coinciden
  'Milton Tapia': 'Milton Tapia',
  'Juan Tapia': 'Juan Tapia', 
  'Apolinar Externo': 'Apolinar Externo',
  'Diego Behar': 'Diego Behar',
  'Jorge Tamayo': 'Jorge Tamayo',
  'Carlos Chacón': 'Carlos Chacón',
  'Damian Amador': 'Damian Amador',
  'Juan Fernando Ochoa': 'Juan Fernando  Ochoa', // Doble espacio en DB
  'Miguel Chiesa': 'Miguel Chiesa',
  'Ruben Cadena': 'Ruben Cadena',
  'Sean Willis': 'Sean Willis',
  'Joffre Palacios': 'Joffre Palacios',
  'Daniel Vela': 'Daniel Vela',
  'Fernando Peña': 'Fernando Peña',
  'Freddy Lopez': 'Freddy Lopez',
  'Roddy Naranjo': 'Roddy Naranjo',
  
  // Nombres que requieren mapeo específico
  'Juan Cortez': 'Juan Antonio Cortez',
  'Mono Benites': 'Mono Benites',
  
  // Jugadores especiales (no participantes del Torneo 28)
  'Juan Guajardo': 'Juan Guajardo', // Existe en DB pero no es participante T28
  
  // Nuevos mapeos para fechas 2-8
  'Jose Luis Toral': 'Jose Luis  Toral', // Doble espacio en DB
  'Jose Patricio Moreno': 'Jose Patricio  Moreno', // Doble espacio en DB
  'Meche Garrido': 'Meche Garrido',
};

// Cache de jugadores para optimización
let playersCache: Map<string, { id: string; fullName: string; role: string }> | null = null;

/**
 * Inicializa el cache de jugadores desde la base de datos
 */
export async function initializePlayersCache(): Promise<void> {
  if (playersCache) return; // Ya inicializado

  const players = await prisma.player.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true
    }
  });

  playersCache = new Map();
  players.forEach(player => {
    const fullName = `${player.firstName} ${player.lastName}`;
    playersCache!.set(fullName, {
      id: player.id,
      fullName,
      role: player.role
    });
  });

  console.log(`✅ Cache de jugadores inicializado: ${playersCache.size} jugadores`);
}

/**
 * Mapea un nombre del CSV al nombre en la base de datos
 */
export function mapCSVNameToDBName(csvName: string): string {
  return PLAYER_NAME_MAPPING[csvName] || csvName;
}

/**
 * Encuentra un jugador en la base de datos por nombre del CSV
 */
export async function findPlayerByCSVName(csvName: string): Promise<{
  id: string;
  fullName: string;
  role: string;
  found: boolean;
  mapped: boolean;
} | null> {
  await initializePlayersCache();

  const dbName = mapCSVNameToDBName(csvName);
  const player = playersCache!.get(dbName);
  
  if (player) {
    return {
      ...player,
      found: true,
      mapped: csvName !== dbName
    };
  }

  return {
    id: '',
    fullName: csvName,
    role: '',
    found: false,
    mapped: false
  };
}

/**
 * Valida todos los nombres de un CSV
 */
export async function validateCSVPlayerNames(csvNames: string[]): Promise<{
  valid: Array<{ csvName: string; dbName: string; playerId: string; role: string }>;
  invalid: Array<{ csvName: string; reason: string }>;
  warnings: Array<{ csvName: string; message: string }>;
}> {
  await initializePlayersCache();

  const valid: Array<{ csvName: string; dbName: string; playerId: string; role: string }> = [];
  const invalid: Array<{ csvName: string; reason: string }> = [];
  const warnings: Array<{ csvName: string; message: string }> = [];

  for (const csvName of csvNames) {
    const player = await findPlayerByCSVName(csvName);
    
    if (player?.found) {
      valid.push({
        csvName,
        dbName: player.fullName,
        playerId: player.id,
        role: player.role
      });

      // Advertencia para jugadores especiales
      if (csvName === 'Juan Guajardo') {
        warnings.push({
          csvName,
          message: 'Juan Guajardo existe en DB pero NO es participante del Torneo 28'
        });
      }
      
      if (player.role === 'Invitado') {
        warnings.push({
          csvName,
          message: `${csvName} es un invitado, no un participante registrado`
        });
      }
    } else {
      invalid.push({
        csvName,
        reason: 'Jugador no encontrado en la base de datos'
      });
    }
  }

  return { valid, invalid, warnings };
}

/**
 * Obtiene participantes registrados del Torneo 28
 */
export async function getTournament28Participants(): Promise<Array<{
  id: string;
  fullName: string;
  role: string;
}>> {
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
      }
    }
  });

  if (!tournament28) return [];

  return tournament28.tournamentParticipants.map(tp => ({
    id: tp.player.id,
    fullName: `${tp.player.firstName} ${tp.player.lastName}`,
    role: tp.player.role
  }));
}

// Función de testing
export async function testPlayerMapping() {
  console.log('🧪 TESTING MAPEO DE JUGADORES...\n');

  const csvNames = [
    'Milton Tapia', 'Juan Tapia', 'Apolinar Externo', 'Diego Behar',
    'Jorge Tamayo', 'Juan Cortez', 'Carlos Chacón', 'Damian Amador',
    'Juan Guajardo', 'Mono Benites', 'Juan Fernando Ochoa', 'Miguel Chiesa',
    'Ruben Cadena', 'Sean Willis', 'Joffre Palacios', 'Daniel Vela',
    'Fernando Peña', 'Freddy Lopez', 'Roddy Naranjo'
  ];

  const validation = await validateCSVPlayerNames(csvNames);

  console.log('✅ JUGADORES VÁLIDOS:');
  validation.valid.forEach((v, index) => {
    console.log(`${index + 1}. "${v.csvName}" → "${v.dbName}" (${v.role}) - ID: ${v.playerId}`);
  });

  if (validation.warnings.length > 0) {
    console.log('\n⚠️  ADVERTENCIAS:');
    validation.warnings.forEach((w, index) => {
      console.log(`${index + 1}. ${w.csvName}: ${w.message}`);
    });
  }

  if (validation.invalid.length > 0) {
    console.log('\n❌ JUGADORES INVÁLIDOS:');
    validation.invalid.forEach((i, index) => {
      console.log(`${index + 1}. ${i.csvName}: ${i.reason}`);
    });
  }

  console.log(`\n📊 RESUMEN: ${validation.valid.length} válidos, ${validation.warnings.length} advertencias, ${validation.invalid.length} errores`);
}

// Ejecutar test si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testPlayerMapping()
    .finally(() => prisma.$disconnect())
    .catch(console.error);
}