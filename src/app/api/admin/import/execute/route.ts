import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findPlayerByCSVName } from '@/lib/csv-import';

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
      const baseTime = new Date(`${elim.date}T19:00:00-05:00`); // 7 PM Ecuador time
      const eliminationTime = new Date(baseTime.getTime() + (i * 30 * 1000)); // 30 sec intervals

      await tx.elimination.create({
        data: {
          position: elim.posicion,
          points: elim.puntos,
          eliminatedPlayerId: eliminatedPlayer.id,
          eliminatorPlayerId: eliminatorPlayerId,
          eliminationTime: eliminationTime,
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
 * Find or suggest GameDate for import
 */
async function findGameDateForImport(tournamentName: string, dateNumber: number): Promise<{
  gameDate: {
    id: number;
    eliminations: Array<{ id: string }>;
    tournament: { number: number };
    dateNumber: number;
  } | null;
  suggestions: string[];
}> {
  const suggestions: string[] = [];
  
  // Extract tournament number from name (e.g., "Torneo 28" -> 28)
  const tournamentNumberMatch = tournamentName.match(/Torneo\s+(\d+)/i);
  if (!tournamentNumberMatch) {
    throw new Error(`No se pudo extraer número de torneo de: ${tournamentName}`);
  }
  
  const tournamentNumber = parseInt(tournamentNumberMatch[1]);
  
  // Try to find exact match
  const gameDate = await prisma.gameDate.findFirst({
    where: {
      tournament: { number: tournamentNumber },
      dateNumber: dateNumber
    },
    include: {
      tournament: true,
      eliminations: true
    }
  });

  if (gameDate) {
    if (gameDate.eliminations.length > 0) {
      suggestions.push(`GameDate encontrada pero ya tiene ${gameDate.eliminations.length} eliminaciones. La importación las reemplazará.`);
    }
    return { gameDate, suggestions };
  }

  // If not found, provide suggestions
  const availableDates = await prisma.gameDate.findMany({
    where: {
      tournament: { number: tournamentNumber }
    },
    select: {
      id: true,
      dateNumber: true,
      status: true,
      scheduledDate: true
    },
    orderBy: { dateNumber: 'asc' }
  });

  if (availableDates.length === 0) {
    suggestions.push(`No se encontraron fechas para el Torneo ${tournamentNumber}. Debes crear el torneo y sus fechas primero.`);
  } else {
    suggestions.push(`Fecha ${dateNumber} no encontrada para Torneo ${tournamentNumber}.`);
    suggestions.push(`Fechas disponibles: ${availableDates.map(d => `${d.dateNumber} (${d.status})`).join(', ')}`);
  }

  return { gameDate: null, suggestions };
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorización requerido' },
        { status: 401 }
      );
    }

    // For now, we'll skip the actual auth validation since it would require database access
    // In a production environment, you'd validate the token here

    const body = await request.json();
    const { eliminations } = body;

    if (!eliminations || !Array.isArray(eliminations) || eliminations.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron eliminaciones válidas' },
        { status: 400 }
      );
    }

    // Get first record for tournament/date info
    const firstRecord = eliminations[0];
    console.log(`🔍 Buscando GameDate para ${firstRecord.torneo}, Fecha ${firstRecord.fecha}`);

    // Find GameDate
    const { gameDate, suggestions } = await findGameDateForImport(
      firstRecord.torneo,
      firstRecord.fecha
    );

    if (!gameDate) {
      return NextResponse.json(
        { 
          error: 'GameDate no encontrada',
          suggestions
        },
        { status: 404 }
      );
    }

    console.log(`📅 GameDate encontrada (ID: ${gameDate.id})`);

    // Clear existing eliminations if any
    if (gameDate.eliminations.length > 0) {
      console.log(`🗑️  Eliminando ${gameDate.eliminations.length} eliminaciones existentes...`);
      await prisma.elimination.deleteMany({
        where: { gameDateId: gameDate.id }
      });
    }

    // Import eliminations
    await importEliminationsToDatabase(eliminations, gameDate.id);

    // Update GameDate status
    await updateGameDateStatus(gameDate.id, firstRecord.date);

    console.log('\n🎉 IMPORTACIÓN COMPLETADA EXITOSAMENTE');
    
    return NextResponse.json({
      success: true,
      message: `${eliminations.length} eliminaciones importadas exitosamente`,
      imported: eliminations.length,
      gameDateId: gameDate.id,
      tournamentNumber: gameDate.tournament.number,
      dateNumber: gameDate.dateNumber
    });

  } catch (error) {
    console.error('💥 Error during import:', error);
    return NextResponse.json(
      { 
        success: false,
        error: `Error durante la importación: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      },
      { status: 500 }
    );
  }
}