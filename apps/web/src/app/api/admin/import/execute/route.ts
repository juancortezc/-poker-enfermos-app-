import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findPlayerByCSVName } from '@/lib/csv-import';
import { requireComision } from '@/lib/api-auth';
import { AppError, withErrorHandler } from '@/lib/errors';
import { ok, parseBody } from '@/lib/http';
import { importExecuteSchema, type CsvElimination as CSVElimination } from '@poker/shared';

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
        throw AppError.badRequest(`Jugador eliminado no encontrado: ${elim.eliminado}`, 'PLAYER_NOT_FOUND');
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
 * Find or suggest GameDate for import
 */
/**
 * El defecto real estaba en los ids de eliminacion: se tipaban como string
 * cuando en el esquema son enteros.
 */
async function findGameDateForImport(tournamentName: string, dateNumber: number): Promise<{
  gameDate: {
    id: number;
    dateNumber: number;
    eliminations: Array<{ id: number }>;
    tournament: { number: number };
  } | null;
  suggestions: string[];
}> {
  const suggestions: string[] = [];
  
  // Extract tournament number from name (e.g., "Torneo 28" -> 28)
  const tournamentNumberMatch = tournamentName.match(/Torneo\s+(\d+)/i);
  if (!tournamentNumberMatch) {
    throw AppError.badRequest(`No se pudo extraer número de torneo de: ${tournamentName}`, 'INVALID_TOURNAMENT');
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

/**
 * Errores: 422 si el body no tiene la forma de /validate; 404
 * GAME_DATE_NOT_FOUND (con `details.suggestions`); 400 PLAYER_NOT_FOUND /
 * INVALID_TOURNAMENT si una fila no se puede importar (antes eran 500).
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  await requireComision(req);
  const { eliminations } = await parseBody(req, importExecuteSchema);

  // Get first record for tournament/date info
  const firstRecord = eliminations[0];
  console.log(`🔍 Buscando GameDate para ${firstRecord.torneo}, Fecha ${firstRecord.fecha}`);

  // Find GameDate
  const { gameDate, suggestions } = await findGameDateForImport(
    firstRecord.torneo,
    firstRecord.fecha
  );

  if (!gameDate) {
    throw AppError.notFound('GameDate no encontrada', 'GAME_DATE_NOT_FOUND', { suggestions });
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
  
  return ok({
    message: `${eliminations.length} eliminaciones importadas exitosamente`,
    imported: eliminations.length,
    gameDateId: gameDate.id,
    tournamentNumber: gameDate.tournament.number,
    dateNumber: gameDate.dateNumber
  });
});