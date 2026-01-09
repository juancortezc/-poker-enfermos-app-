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
        joinDate: true,
        role: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    const today = new Date();

    // Helper para parsear fechas en varios formatos
    const parseDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;

      // Formato YYYY-MM-DD (ISO)
      if (dateStr.includes('-') && dateStr.length === 10) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      }

      // Formato DD/MM/YYYY
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
      }

      return null;
    };

    // Calcular días sin ganar para cada jugador
    const playersWithVictoryData: PlayerWithVictoryData[] = activePlayers.map(player => {
      let daysWithoutVictory = 0;
      let hasNeverWon = true;
      let referenceDate: string | null = null;

      if (player.lastVictoryDate) {
        // Tiene victoria previa - calcular desde esa fecha
        hasNeverWon = false;
        const lastVictoryDate = parseDate(player.lastVictoryDate);

        if (lastVictoryDate) {
          const timeDiff = today.getTime() - lastVictoryDate.getTime();
          daysWithoutVictory = Math.floor(timeDiff / (1000 * 3600 * 24));
          referenceDate = player.lastVictoryDate;
        }
      } else if (player.joinDate) {
        // Nunca ha ganado pero tiene fecha de ingreso - calcular desde esa fecha
        hasNeverWon = false; // Lo tratamos como si tuviera una "victoria virtual" al unirse
        const joinDate = parseDate(player.joinDate);

        if (joinDate) {
          const timeDiff = today.getTime() - joinDate.getTime();
          daysWithoutVictory = Math.floor(timeDiff / (1000 * 3600 * 24));
          // Mostrar la fecha de ingreso como referencia
          referenceDate = player.joinDate;
        }
      } else {
        // Ni victoria ni fecha de ingreso - marcar como N/A
        daysWithoutVictory = 999999;
      }

      return {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        photoUrl: player.photoUrl,
        lastVictoryDate: referenceDate, // Usamos referenceDate para mostrar
        daysWithoutVictory,
        hasNeverWon: !player.lastVictoryDate && !player.joinDate // Solo N/A si no tiene ninguna fecha
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