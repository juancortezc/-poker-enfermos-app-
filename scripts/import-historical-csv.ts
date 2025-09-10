import { prisma } from '../src/lib/prisma.js';
import { readFileSync } from 'fs';
import { validateCSVPlayerNames, findPlayerByCSVName, getTournament28Participants } from './player-name-mapping.js';

interface CSVElimination {
  torneo: string;
  fecha: number;
  date: string;
  posicion: number;
  eliminado: string;
  eliminador: string;
  puntos: number;
}

/**
 * Parse CSV content to elimination records
 */
function parseCSV(csvContent: string): CSVElimination[] {
  const lines = csvContent.trim().split('\n');
  const eliminations: CSVElimination[] = [];

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(',');
    if (columns.length < 7) {
      console.warn(`⚠️  Línea ${i + 1} inválida: ${line}`);
      continue;
    }

    eliminations.push({
      torneo: columns[0].trim(),
      fecha: parseInt(columns[1].trim()),
      date: columns[2].trim(),
      posicion: parseInt(columns[3].trim()),
      eliminado: columns[4].trim(),
      eliminador: columns[5].trim(),
      puntos: parseInt(columns[6].trim())
    });
  }

  return eliminations;
}

/**
 * Validate elimination data against database
 */
async function validateCSVData(eliminations: CSVElimination[]): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
  playerValidation: any;
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validate tournament and date
  const firstRecord = eliminations[0];
  if (firstRecord.torneo !== 'Torneo 28') {
    errors.push(`Torneo incorrecto: ${firstRecord.torneo} (esperado: Torneo 28)`);
  }

  // 2. Validate positions are sequential (1 to N)
  const positions = eliminations.map(e => e.posicion).sort((a, b) => a - b); // Fixed: use 'posicion' not 'position'
  const expectedLength = positions.length;
  
  console.log(`🔍 Debug positions: [${positions.join(', ')}]`);
  console.log(`🔍 Expected length: ${expectedLength}`);
  
  for (let i = 0; i < expectedLength; i++) {
    if (positions[i] !== i + 1) {
      console.log(`❌ Position check failed at index ${i}: got ${positions[i]}, expected ${i + 1}`);
      errors.push(`Posiciones no secuenciales: falta posición ${i + 1}`);
      break;
    }
  }

  // Check for duplicates
  const uniquePositions = [...new Set(positions)];
  if (uniquePositions.length !== positions.length) {
    console.log(`❌ Duplicates: unique ${uniquePositions.length} vs total ${positions.length}`);
    errors.push('Posiciones duplicadas encontradas');
  }

  // 3. Validate players
  const allPlayerNames = [...new Set([
    ...eliminations.map(e => e.eliminado),
    ...eliminations.filter(e => e.eliminador).map(e => e.eliminador)
  ])];

  const playerValidation = await validateCSVPlayerNames(allPlayerNames);
  
  if (playerValidation.invalid.length > 0) {
    playerValidation.invalid.forEach(invalid => {
      errors.push(`Jugador no encontrado: ${invalid.csvName}`);
    });
  }

  // 4. Validate winner (position 1) has no eliminator
  const winner = eliminations.find(e => e.position === 1);
  if (winner && winner.eliminador) {
    warnings.push(`Ganador ${winner.eliminado} tiene eliminador: ${winner.eliminador}`);
  }

  // 5. Validate date format
  if (!firstRecord.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.push(`Formato de fecha incorrecto: ${firstRecord.date} (esperado: YYYY-MM-DD)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    playerValidation
  };
}

/**
 * Import eliminations to database
 */
async function importEliminationsToDatabase(
  eliminations: CSVElimination[],
  gameDateId: number
): Promise<void> {
  console.log(`📝 Importando ${eliminations.length} eliminaciones...`);

  // Import in transaction
  await prisma.$transaction(async (tx) => {
    // Sort eliminations by position (descending - last to first)
    const sortedEliminations = eliminations.sort((a, b) => b.posicion - a.posicion);

    for (let i = 0; i < sortedEliminations.length; i++) {
      const elim = sortedEliminations[i];
      
      // Find players
      const eliminatedPlayer = await findPlayerByCSVName(elim.eliminado);
      
      if (!eliminatedPlayer?.found) {
        throw new Error(`Jugador eliminado no encontrado: ${elim.eliminado}`);
      }

      let eliminatorPlayerId = eliminatedPlayer.id; // Default to self-elimination
      
      if (elim.eliminador && elim.eliminador.trim() !== '') {
        const eliminatorPlayer = await findPlayerByCSVName(elim.eliminador);
        if (eliminatorPlayer?.found) {
          eliminatorPlayerId = eliminatorPlayer.id;
        } else {
          console.warn(`⚠️  Eliminador no encontrado: ${elim.eliminador}, usando auto-eliminación`);
        }
      }

      // Calculate elimination time (spaced by 30 seconds)
      const baseTime = new Date('2025-04-15T19:00:00-05:00'); // 7 PM Ecuador time
      const eliminationTime = new Date(baseTime.getTime() + (i * 30 * 1000)); // 30 sec intervals

      await tx.elimination.create({
        data: {
          position: elim.posicion,
          points: elim.puntos,
          eliminatedPlayerId: eliminatedPlayer.id,
          eliminatorPlayerId: eliminatorPlayerId,
          eliminationTime: eliminationTime.toISOString(),
          gameDateId: gameDateId
        }
      });

      console.log(`  ✅ Pos ${elim.posicion}: ${elim.eliminado} (${elim.puntos} pts)`);
    }
  });
}

/**
 * Update GameDate status after import
 */
async function updateGameDateStatus(gameDateId: number, date: string): Promise<void> {
  const startTime = new Date(`${date}T19:00:00-05:00`); // 7 PM Ecuador time
  
  await prisma.gameDate.update({
    where: { id: gameDateId },
    data: {
      status: 'completed',
      startTime: startTime
    }
  });
  
  console.log('✅ GameDate actualizada a status: completed');
}

/**
 * Main import function
 */
export async function importHistoricalCSV(filePath: string): Promise<{
  success: boolean;
  message: string;
  imported: number;
}> {
  try {
    console.log(`📁 Importando archivo: ${filePath}\n`);

    // 1. Read and parse CSV
    const csvContent = readFileSync(filePath, 'utf-8');
    const eliminations = parseCSV(csvContent);
    
    console.log(`📄 CSV parseado: ${eliminations.length} eliminaciones encontradas`);

    // 2. Validate data
    const validation = await validateCSVData(eliminations);
    
    if (!validation.valid) {
      console.log('❌ ERRORES DE VALIDACIÓN:');
      validation.errors.forEach(error => console.log(`  - ${error}`));
      return {
        success: false,
        message: `Errores de validación: ${validation.errors.join(', ')}`,
        imported: 0
      };
    }

    if (validation.warnings.length > 0) {
      console.log('⚠️  ADVERTENCIAS:');
      validation.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    console.log('✅ Validación exitosa\n');

    // 3. Find GameDate
    const firstRecord = eliminations[0];
    const gameDate = await prisma.gameDate.findFirst({
      where: {
        tournament: { number: 28 },
        dateNumber: firstRecord.fecha
      }
    });

    if (!gameDate) {
      return {
        success: false,
        message: `GameDate no encontrada para Torneo 28, Fecha ${firstRecord.fecha}`,
        imported: 0
      };
    }

    console.log(`📅 GameDate encontrada (ID: ${gameDate.id})`);

    // 4. Import eliminations
    await importEliminationsToDatabase(eliminations, gameDate.id);

    // 5. Update GameDate status
    await updateGameDateStatus(gameDate.id, firstRecord.date);

    console.log('\n🎉 IMPORTACIÓN COMPLETADA EXITOSAMENTE');
    
    return {
      success: true,
      message: `${eliminations.length} eliminaciones importadas exitosamente`,
      imported: eliminations.length
    };

  } catch (error) {
    console.error('💥 Error durante la importación:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      imported: 0
    };
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('❌ Uso: npx tsx scripts/import-historical-csv.ts <path-to-csv>');
    process.exit(1);
  }

  importHistoricalCSV(filePath)
    .then(result => {
      console.log('\n📊 RESULTADO:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}