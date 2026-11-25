import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseQuery } from '@/lib/http'
import { authMeQuerySchema } from '@poker/shared'

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { id: userId } = parseQuery(req, authMeQuerySchema)

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
    throw AppError.notFound('Usuario no encontrado', 'PLAYER_NOT_FOUND')
  }

  return ok({
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    role: player.role,
    photoUrl: player.photoUrl || undefined,
  })
})
