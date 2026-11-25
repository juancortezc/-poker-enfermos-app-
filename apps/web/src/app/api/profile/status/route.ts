import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'
import { prisma } from '@/lib/prisma'

export const GET = withErrorHandler(async (req: NextRequest) => {
  return withAuth(req, async (_req, user) => {
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
      throw AppError.notFound('Usuario no encontrado', 'USER_NOT_FOUND', { authenticated: false })
    }

    const hasPinConfigured = Boolean(player.pin)
    const hasContactInfo = Boolean(player.email || player.phone)
    const hasBirthDate = Boolean(player.birthDate)
    const hasPhoto = Boolean(player.photoUrl)
    const profileComplete = hasPinConfigured && hasContactInfo

    return ok({
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
  })
})
