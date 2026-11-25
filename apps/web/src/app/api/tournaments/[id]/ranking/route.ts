import { NextRequest } from 'next/server';
import { idParamsSchema } from '@poker/shared';
import { AppError, withErrorHandler } from '@/lib/errors';
import { ok, parseParams } from '@/lib/http';
import { calculateTournamentRanking } from '@/lib/ranking-utils';

/**
 * GET /api/tournaments/[id]/ranking
 *
 * Ranking completo del torneo. Endpoint publico.
 *
 * FUENTE UNICA: calculateTournamentRanking() de lib/ranking-utils.
 *
 * Antes esta ruta usaba una segunda implementacion propia, en la capa de
 * dominio (RankingCalculator + Elimina2Score + TiebreakerStats). Las dos
 * calculaban "lo mismo" y daban resultados distintos, que es justo lo que no
 * puede pasar con la tabla del torneo:
 *
 *  - la del dominio escribia 0 al que seguia jugando una fecha en curso, con
 *    lo que ese 0 entraba al ELIMINA como si fuera un resultado real;
 *  - acreditaba puntos de ganador a cualquiera sin fila de eliminacion en una
 *    fecha cerrada, inventando victorias;
 *  - y desempataba por puntos totales ANTES de mirar victorias y podios.
 *
 * Los tres defectos ya estaban corregidos en lib, pero la tabla que ve la
 * gente venia por aqui y no los recibia. Si hay que cambiar como se calcula el
 * ranking, se cambia en lib y punto.
 */
export const GET = withErrorHandler(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id: tournamentId } = parseParams(await params, idParamsSchema);

    const rankingData = await calculateTournamentRanking(tournamentId);

    if (!rankingData) {
      throw AppError.notFound('Torneo no encontrado', 'TOURNAMENT_NOT_FOUND');
    }

    return ok(rankingData);
  }
);
