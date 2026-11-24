import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, user) => {
    try {
      const player = await prisma.player.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          photoUrl: true,
          pin: true,
          email: true,
          phone: true,
          birthDate: true,
          isActive: true,
        },
      })

      if (!player) {
        return NextResponse.json(
          {
            authenticated: false,
            reason: 'USER_NOT_FOUND',
          },
          { status: 404 }
        )
      }

      const hasPinConfigured = Boolean(player.pin)
      const hasContactInfo = Boolean(player.email || player.phone)
      const hasBirthDate = Boolean(player.birthDate)
      const hasPhoto = Boolean(player.photoUrl)
      const profileComplete = hasPinConfigured && hasContactInfo

      return NextResponse.json({
        authenticated: true,
        user: {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          role: player.role,
          photoUrl: player.photoUrl,
          isActive: player.isActive,
        },
        checks: {
          hasPinConfigured,
          hasContactInfo,
          hasBirthDate,
          hasPhoto,
        },
        profileComplete,
      })
    } catch (error) {
      console.error('Error fetching profile status:', error)
      return NextResponse.json(
        {
          authenticated: false,
          error: 'Error interno del servidor',
        },
        { status: 500 }
      )
    }
  })
}
