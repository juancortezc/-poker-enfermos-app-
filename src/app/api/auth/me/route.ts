import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    // Get user ID from query or header
    const userId = req.nextUrl.searchParams.get('id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const player = await prisma.player.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        photoUrl: true,
      }
    })

    if (!player) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      role: player.role,
      photoUrl: player.photoUrl || undefined,
    })

  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
