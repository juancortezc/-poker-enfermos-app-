import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/stats/parent-child/[tournamentId]/[relationId] - Detalle de eliminaciones de una relación P&H
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string; relationId: string }> }
) {
  try {
    const { tournamentId: tournamentIdStr, relationId: relationIdStr } = await params
    const tournamentId = parseInt(tournamentIdStr)
    const relationId = parseInt(relationIdStr)

    if (isNaN(tournamentId) || isNaN(relationId)) {
      return NextResponse.json(
        { error: 'IDs inválidos' },
        { status: 400 }
      )
    }

    // Obtener la relación P&H
    const relation = await prisma.parentChildStats.findUnique({
      where: { id: relationId },
      include: {
        parentPlayer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true
          }
        },
        childPlayer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true
          }
        }
      }
    })

    if (!relation || relation.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: 'Relación no encontrada' },
        { status: 404 }
      )
    }

    // Obtener todas las eliminaciones de esta relación
    const eliminations = await prisma.elimination.findMany({
      where: {
        eliminatorPlayerId: relation.parentPlayerId,
        eliminatedPlayerId: relation.childPlayerId,
        gameDate: {
          tournamentId
        }
      },
      include: {
        gameDate: {
          select: {
            id: true,
            dateNumber: true,
            scheduledDate: true
          }
        }
      },
      orderBy: {
        gameDate: {
          scheduledDate: 'asc'
        }
      }
    })

    return NextResponse.json({
      relation: {
        id: relation.id,
        eliminationCount: relation.eliminationCount,
        isActiveRelation: relation.isActiveRelation,
        firstElimination: relation.firstElimination,
        lastElimination: relation.lastElimination,
        parentPlayer: relation.parentPlayer,
        childPlayer: relation.childPlayer
      },
      eliminations: eliminations.map(e => ({
        id: e.id,
        position: e.position,
        dateNumber: e.gameDate.dateNumber,
        scheduledDate: e.gameDate.scheduledDate
      }))
    })

  } catch (error) {
    console.error('Error fetching P&H relation details:', error)
    return NextResponse.json(
      { error: 'Error al obtener detalles' },
      { status: 500 }
    )
  }
}
