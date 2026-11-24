import { NextRequest, NextResponse } from 'next/server';
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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id);

    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
    }

    const rankingData = await calculateTournamentRanking(tournamentId);

    if (!rankingData) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    return NextResponse.json(rankingData);
  } catch (error) {
    console.error('Error calculando el ranking del torneo:', error);
    return NextResponse.json({ error: 'Error calculando el ranking' }, { status: 500 });
  }
}
