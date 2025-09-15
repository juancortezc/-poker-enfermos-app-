import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface PlayerWithVictoryData {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  lastVictoryDate?: string | null;
  daysWithoutVictory: number;
  hasNeverWon: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const tournamentId = parseInt((await params).tournamentId);

    if (isNaN(tournamentId)) {
      return NextResponse.json(
        { error: 'Invalid tournament ID' },
        { status: 400 }
      );
    }

    // Obtener el torneo solo para referencia del número
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        number: true,
        name: true
      }
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Obtener TODOS los jugadores activos (Comision y Enfermo)
    const activePlayers = await prisma.player.findMany({
      where: {
        isActive: true,
        role: {
          in: ['Comision', 'Enfermo']
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        lastVictoryDate: true,
        role: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    const today = new Date();
    
    // Calcular días sin ganar para cada jugador
    const playersWithVictoryData: PlayerWithVictoryData[] = activePlayers.map(player => {
      let daysWithoutVictory = 0;
      let hasNeverWon = true;

      if (player.lastVictoryDate) {
        hasNeverWon = false;
        // Parsear fecha desde formato DD/MM/YYYY
        const [day, month, year] = player.lastVictoryDate.split('/').map(Number);
        const lastVictoryDate = new Date(year, month - 1, day); // month - 1 porque Date usa 0-based months
        
        const timeDiff = today.getTime() - lastVictoryDate.getTime();
        daysWithoutVictory = Math.floor(timeDiff / (1000 * 3600 * 24));
      } else {
        // Si nunca ha ganado, calcular días desde el inicio del torneo
        // Para efectos de este reporte, usaremos un valor muy alto para ordenar al final
        daysWithoutVictory = 999999;
      }

      return {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        photoUrl: player.photoUrl,
        lastVictoryDate: player.lastVictoryDate,
        daysWithoutVictory,
        hasNeverWon
      };
    });

    // Ordenar por días sin ganar (descendente) - los que más días tienen sin ganar aparecen primero
    // Los que nunca han ganado van al final
    const sortedPlayers = playersWithVictoryData.sort((a, b) => {
      // Primero los que sí han ganado alguna vez, ordenados por días sin ganar (desc)
      if (!a.hasNeverWon && !b.hasNeverWon) {
        return b.daysWithoutVictory - a.daysWithoutVictory;
      }
      // Los que nunca han ganado van al final
      if (a.hasNeverWon && !b.hasNeverWon) return 1;
      if (!a.hasNeverWon && b.hasNeverWon) return -1;
      // Si ambos nunca han ganado, ordenar alfabéticamente
      if (a.hasNeverWon && b.hasNeverWon) {
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      }
      return 0;
    });

    // Calcular estadísticas adicionales
    const playersWithVictories = sortedPlayers.filter(p => !p.hasNeverWon);
    const playersNeverWon = sortedPlayers.filter(p => p.hasNeverWon);
    const averageDaysWithoutVictory = playersWithVictories.length > 0 
      ? Math.round(playersWithVictories.reduce((sum, p) => sum + p.daysWithoutVictory, 0) / playersWithVictories.length)
      : 0;

    const response = {
      tournament: {
        id: tournament.id,
        number: tournament.number,
        name: tournament.name
      },
      players: sortedPlayers,
      stats: {
        totalPlayers: sortedPlayers.length,
        playersWithVictories: playersWithVictories.length,
        playersNeverWon: playersNeverWon.length,
        averageDaysWithoutVictory,
        longestStreak: playersWithVictories.length > 0 ? playersWithVictories[0].daysWithoutVictory : 0
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching days without victory data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch days without victory data' },
      { status: 500 }
    );
  }
}