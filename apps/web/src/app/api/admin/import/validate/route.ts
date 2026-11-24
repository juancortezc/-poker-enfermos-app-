import { NextRequest, NextResponse } from 'next/server';
import { validateCSVPlayerNames } from '@/lib/csv-import';
import { withComisionAuth } from '@/lib/api-auth';

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
  playerValidation: {
    valid: Array<{ csvName: string; dbName: string; playerId: string; role: string }>;
    invalid: Array<{ csvName: string; reason: string }>;
    warnings: Array<{ csvName: string; message: string }>;
  };
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (eliminations.length === 0) {
    errors.push('Archivo CSV vacío o sin datos válidos');
    return {
      valid: false,
      errors,
      warnings,
      playerValidation: { valid: [], invalid: [], warnings: [] }
    };
  }

  // 1. Validate tournament and date
  const firstRecord = eliminations[0];
  if (!firstRecord.torneo.includes('Torneo')) {
    errors.push(`Formato de torneo incorrecto: ${firstRecord.torneo} (esperado: "Torneo X")`);
  }

  // 2. Validate positions are sequential (1 to N)
  const positions = eliminations.map(e => e.posicion).sort((a, b) => a - b);
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
    ...eliminations.filter(e => e.eliminador && e.eliminador.trim()).map(e => e.eliminador)
  ])];

  const playerValidation = await validateCSVPlayerNames(allPlayerNames);
  
  if (playerValidation.invalid.length > 0) {
    playerValidation.invalid.forEach(invalid => {
      errors.push(`Jugador no encontrado: ${invalid.csvName}`);
    });
  }

  // 4. Validate winner (position 1) has no eliminator
  const winner = eliminations.find(e => e.posicion === 1);
  if (winner && winner.eliminador && winner.eliminador.trim()) {
    warnings.push(`Ganador ${winner.eliminado} tiene eliminador: ${winner.eliminador}`);
  }

  // 5. Validate date format
  if (!firstRecord.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.push(`Formato de fecha incorrecto: ${firstRecord.date} (esperado: YYYY-MM-DD)`);
  }

  // 6. Validate points are reasonable
  const invalidPoints = eliminations.filter(e => e.puntos < 0 || e.puntos > 30);
  if (invalidPoints.length > 0) {
    errors.push(`Puntos inválidos encontrados (deben estar entre 0-30): ${invalidPoints.map(e => `Pos ${e.posicion}: ${e.puntos} pts`).join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    playerValidation
  };
}

export async function POST(request: NextRequest) {
  return withComisionAuth(request, async (req) => {
    try {
      // Get uploaded file
      const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos CSV' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande (máximo 5MB)' },
        { status: 400 }
      );
    }

    // Read and parse CSV
    const csvContent = await file.text();
    console.log('📄 CSV content received, length:', csvContent.length);
    
    const eliminations = parseCSV(csvContent);
    console.log(`📊 CSV parseado: ${eliminations.length} eliminaciones encontradas`);

    if (eliminations.length === 0) {
      return NextResponse.json(
        { error: 'Archivo CSV vacío o sin datos válidos' },
        { status: 400 }
      );
    }

    // Validate data
    const validation = await validateCSVData(eliminations);
    
    // Create preview data
    const firstRecord = eliminations[0];
    const uniquePlayers = [...new Set([
      ...eliminations.map(e => e.eliminado),
      ...eliminations.filter(e => e.eliminador && e.eliminador.trim()).map(e => e.eliminador)
    ])];

    const previewData = {
      totalRecords: eliminations.length,
      playerCount: uniquePlayers.length,
      tournamentInfo: {
        tournament: firstRecord.torneo,
        date: firstRecord.date,
        dateNumber: firstRecord.fecha
      }
    };

    console.log('✅ Validation completed:', {
      valid: validation.valid,
      errors: validation.errors.length,
      warnings: validation.warnings.length,
      players: validation.playerValidation.valid.length
    });

    return NextResponse.json({
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      playerValidation: validation.playerValidation,
      eliminations,
      previewData
    });

    } catch (error) {
      console.error('💥 Error validating CSV:', error);
      return NextResponse.json(
        { error: `Error procesando archivo: ${error instanceof Error ? error.message : 'Error desconocido'}` },
        { status: 500 }
      );
    }
  });
}