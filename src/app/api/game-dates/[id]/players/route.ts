import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameDateId = params.id;

    // Obtener la fecha con sus jugadores
    const gameDate = await prisma.gameDate.findUnique({
      where: { id: gameDateId },
      select: {
        playerIds: true
      }
    });

    if (!gameDate) {
      return NextResponse.json(
        { error: 'Game date not found' },
        { status: 404 }
      );
    }

    // Obtener información de todos los jugadores
    const players = await prisma.player.findMany({
      where: {
        id: { in: gameDate.playerIds }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching game date players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}