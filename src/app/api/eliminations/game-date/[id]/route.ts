import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameDateId = params.id;

    // Obtener todas las eliminaciones de la fecha
    const eliminations = await prisma.elimination.findMany({
      where: {
        gameDateId
      },
      include: {
        eliminatedPlayer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        eliminatorPlayer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        position: 'desc' // Orden descendente para mostrar las más recientes primero
      }
    });

    return NextResponse.json(eliminations);
  } catch (error) {
    console.error('Error fetching eliminations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch eliminations' },
      { status: 500 }
    );
  }
}