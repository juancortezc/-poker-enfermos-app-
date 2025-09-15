import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWinnerPoints } from '@/lib/tournament-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gameDateId = parseInt((await params).id);

    // Obtener la fecha con todos sus datos
    const gameDate = await prisma.gameDate.findUnique({
      where: { id: gameDateId },
      include: {
        tournament: {
          include: {
            blindLevels: {
              orderBy: {
                level: 'asc'
              }
            }
          }
        },
        eliminations: {
          include: {
            eliminatedPlayer: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!gameDate) {
      return NextResponse.json(
        { error: 'Game date not found' },
        { status: 404 }
      );
    }

    // Calcular jugadores activos (no eliminados)
    const eliminatedPlayerIds = gameDate.eliminations.map(e => e.eliminatedPlayerId);
    const activePlayers = gameDate.playerIds.filter(
      playerId => !eliminatedPlayerIds.includes(playerId)
    );

    // Obtener información de los jugadores activos
    const activePlayersData = await prisma.player.findMany({
      where: {
        id: { in: activePlayers }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    });

    // Calcular el nivel de blind actual basado en el tiempo transcurrido
    let currentBlindLevel = gameDate.tournament.blindLevels[0];
    if (gameDate.startTime) {
      const elapsedMinutes = Math.floor(
        (Date.now() - gameDate.startTime.getTime()) / 1000 / 60
      );
      
      let accumulatedTime = 0;
      for (const blind of gameDate.tournament.blindLevels) {
        if (blind.duration === 0) {
          // Último nivel sin límite de tiempo
          currentBlindLevel = blind;
          break;
        }
        
        accumulatedTime += blind.duration;
        if (elapsedMinutes < accumulatedTime) {
          currentBlindLevel = blind;
          break;
        }
      }
    }

    // Calcular tiempo restante del blind actual
    let timeRemaining = 0;
    if (currentBlindLevel.duration > 0 && gameDate.startTime) {
      const elapsedMinutes = Math.floor(
        (Date.now() - gameDate.startTime.getTime()) / 1000 / 60
      );
      
      let levelStartTime = 0;
      for (const blind of gameDate.tournament.blindLevels) {
        if (blind.level === currentBlindLevel.level) {
          break;
        }
        levelStartTime += blind.duration;
      }
      
      const elapsedInCurrentLevel = elapsedMinutes - levelStartTime;
      timeRemaining = Math.max(0, currentBlindLevel.duration * 60 - elapsedInCurrentLevel * 60);
    }

    // Calcular próxima posición
    const lastElimination = gameDate.eliminations.reduce((max, e) => 
      e.position < max.position ? e : max,
      { position: gameDate.playerIds.length + 1 }
    );
    const nextPosition = lastElimination.position - 1;

    // Calcular puntos del ganador
    const winnerPoints = getWinnerPoints(gameDate.playerIds.length);

    const status = {
      gameDate: {
        id: gameDate.id,
        dateNumber: gameDate.dateNumber,
        status: gameDate.status,
        totalPlayers: gameDate.playerIds.length,
        startedAt: gameDate.startTime,
        scheduledDate: gameDate.scheduledDate
      },
      tournament: {
        id: gameDate.tournament.id,
        number: gameDate.tournament.number,
        name: gameDate.tournament.name
      },
      liveStats: {
        playersRemaining: activePlayers.length,
        totalPlayers: gameDate.playerIds.length,
        winnerPoints,
        nextPosition,
        eliminationsCount: gameDate.eliminations.length
      },
      currentBlind: {
        level: currentBlindLevel.level,
        smallBlind: currentBlindLevel.smallBlind,
        bigBlind: currentBlindLevel.bigBlind,
        duration: currentBlindLevel.duration,
        timeRemaining
      },
      activePlayers: activePlayersData,
      recentEliminations: gameDate.eliminations
        .sort((a, b) => b.position - a.position)
        .slice(0, 5)
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching game date live status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live status' },
      { status: 500 }
    );
  }
}