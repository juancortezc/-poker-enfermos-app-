import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withComisionAuth } from '@/lib/api-auth'

// GET /api/multas - Lista de multas, filtrable por torneo y/o jugador (público, se muestra a todos los usuarios)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tournamentId = searchParams.get('tournamentId')
    const playerId = searchParams.get('playerId')

    const where: Record<string, unknown> = {}
    if (tournamentId) where.tournamentId = parseInt(tournamentId)
    if (playerId) where.playerId = playerId

    const adjustments = await prisma.playerAdjustment.findMany({
      where,
      include: {
        player: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(adjustments)
  } catch (error) {
    console.error('Error fetching multas:', error)
    return NextResponse.json(
      { error: 'Error al obtener multas' },
      { status: 500 }
    )
  }
}

// POST /api/multas - Registrar una nueva multa (solo Comision)
export async function POST(req: NextRequest) {
  return withComisionAuth(req, async (req, user) => {
    try {
      const data = await req.json()
      const { tournamentId, playerId, reason, pointsPenalty, chipsAmount, moneyAmount, paid } = data

      if (!tournamentId || !playerId || !reason) {
        return NextResponse.json(
          { error: 'tournamentId, playerId y reason son obligatorios' },
          { status: 400 }
        )
      }

      const adjustment = await prisma.playerAdjustment.create({
        data: {
          tournamentId: parseInt(tournamentId),
          playerId,
          reason,
          pointsPenalty: pointsPenalty ? parseInt(pointsPenalty) : 0,
          chipsAmount: chipsAmount ? parseInt(chipsAmount) : null,
          moneyAmount: moneyAmount ? parseFloat(moneyAmount) : null,
          paid: paid ?? false,
          createdById: user.id
        },
        include: {
          player: {
            select: { id: true, firstName: true, lastName: true, photoUrl: true }
          }
        }
      })

      return NextResponse.json(adjustment, { status: 201 })
    } catch (error) {
      console.error('Error creating multa:', error)
      return NextResponse.json(
        { error: 'Error al crear multa' },
        { status: 500 }
      )
    }
  })
}
