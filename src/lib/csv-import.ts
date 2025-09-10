import { prisma } from './prisma';

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