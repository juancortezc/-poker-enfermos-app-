import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/stats/parent-child/[tournamentId]/public - Versión pública para testing
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const tournamentId = parseInt((await params).tournamentId)
    
    if (isNaN(tournamentId)) {
      return NextResponse.json(
        { error: 'ID de torneo inválido' },
        { status: 400 }
      )
    }

    // Verificar que el torneo existe
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, number: true, name: true }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Torneo no encontrado' },
        { status: 404 }
      )
    }

    // Obtener estadísticas de relaciones padre-hijo activas (≥3 eliminaciones)
    const parentChildStats = await prisma.parentChildStats.findMany({
      where: {
        tournamentId,
        isActiveRelation: true // Solo relaciones activas (≥3 eliminaciones)
      },
      include: {
        parentPlayer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            role: true
          }
        },
        childPlayer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            role: true
          }
        }
      },
      orderBy: [
        { eliminationCount: 'desc' }, // Más eliminaciones primero
        { lastElimination: 'desc' }   // Más recientes primero
      ]
    })

    // Filtrar solo jugadores registrados en el torneo (no invitados)
    const filteredStats = parentChildStats.filter(stat => 
      stat.parentPlayer.role !== 'Invitado' && stat.childPlayer.role !== 'Invitado'
    )

    return NextResponse.json({
      tournament,
      parentChildRelations: filteredStats,
      totalRelations: filteredStats.length
    })

  } catch (error) {
    console.error('Error fetching parent-child stats:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    )
  }
}