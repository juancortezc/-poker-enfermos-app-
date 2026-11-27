import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findPlayerByCSVName } from '@/lib/csv-import';
import { requireComision } from '@/lib/api-auth';
import { AppError, withErrorHandler } from '@/lib/errors';
import { ok, parseBody } from '@/lib/http';
import { importExecuteSchema } from '@poker/shared';
import {
  assertImportableStatus,
  buildEliminationRows,
  replaceGameDateEliminations,
} from '@/lib/import-eliminations';

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
    status: string;
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
 * Errores: 422 si el body no tiene la forma de /validate o el CSV no cumple
 * las reglas (`importRowsProblems`: misma fecha, posiciones 1..N, puntos de
 * la tabla oficial); 409 GAME_DATE_IN_PROGRESS si la fecha se está jugando; 404
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

  // Falla rápido; la transacción vuelve a comprobarlo por si cambió.
  assertImportableStatus(gameDate.status);

  // Los jugadores se resuelven antes de abrir la transacción: un nombre
  // desconocido corta aquí, sin haber tocado la base.
  const rows = await buildEliminationRows(eliminations, async (name) => {
    const player = await findPlayerByCSVName(name);
    return player?.found ? player.id : null;
  });

  // Borrar, crear y completar la fecha: todo o nada.
  const { deleted } = await replaceGameDateEliminations(prisma, gameDate.id, firstRecord.date, rows);
  console.log(`📝 Importadas ${rows.length} eliminaciones (reemplazadas ${deleted})`);

  console.log('\n🎉 IMPORTACIÓN COMPLETADA EXITOSAMENTE');
  
  return ok({
    message: `${eliminations.length} eliminaciones importadas exitosamente`,
    imported: eliminations.length,
    gameDateId: gameDate.id,
    tournamentNumber: gameDate.tournament.number,
    dateNumber: gameDate.dateNumber
  });
});