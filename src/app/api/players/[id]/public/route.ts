import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPlayerPhotoUrl } from '@/lib/player-utils'

// GET /api/players/:id/public - Obtener información pública del jugador
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const player = await prisma.player.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        aliases: true,
        photoUrl: true,
        role: true,
        lastVictoryDate: true,
        isActive: true
      }
    })

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    if (!player.isActive) {
      return NextResponse.json(
        { error: 'Player is not active' },
        { status: 404 }
      )
    }

    // Return player with correct photo URL (guests always get duck image)
    return NextResponse.json({
      ...player,
      photoUrl: getPlayerPhotoUrl(player.photoUrl, player.role)
    })
  } catch (error) {
    console.error('Error fetching player public data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player data' },
      { status: 500 }
    )
  }
}