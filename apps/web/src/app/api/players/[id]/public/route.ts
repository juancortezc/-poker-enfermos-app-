import { prisma } from '@/lib/prisma'
import { getPlayerPhotoUrl } from '@/lib/player-utils'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseParams } from '@/lib/http'
import { playerIdParamsSchema } from '@poker/shared'

// GET /api/players/:id/public - Obtener información pública del jugador
export const GET = withErrorHandler(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = parseParams(await params, playerIdParamsSchema)

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
    throw AppError.notFound('Jugador no encontrado', 'PLAYER_NOT_FOUND')
  }

  if (!player.isActive) {
    throw AppError.notFound('El jugador no está activo', 'PLAYER_INACTIVE')
  }

  // Return player with correct photo URL (guests always get duck image)
  return ok({
    ...player,
    photoUrl: getPlayerPhotoUrl(player.photoUrl, player.role)
  })
})
