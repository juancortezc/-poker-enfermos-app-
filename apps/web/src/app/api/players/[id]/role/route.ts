import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { requireComision, invalidatePlayerTokens } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody, parseParams } from '@/lib/http'
import { PLAYER_ADMIN_SELECT } from '@/lib/player-select'
import { GUEST_PHOTO_URL, changePlayerRoleSchema, playerIdParamsSchema } from '@poker/shared'

// PATCH /api/players/:id/role - Cambiar rol de jugador (solo Comisión)
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireComision(request)
  const { id } = parseParams(await params, playerIdParamsSchema)
  // Rol valido; un Invitado necesita quien lo invite (422 si falta).
  const { newRole, inviterId } = await parseBody(request, changePlayerRoleSchema)

  if (id === user.id && newRole !== UserRole.Comision) {
    throw AppError.forbidden('No puedes quitarte el rol Comisión a ti mismo', 'SELF_DEMOTION')
  }

  const existingPlayer = await prisma.player.findUnique({
    where: { id },
    select: { id: true, photoUrl: true }
  })

  if (!existingPlayer) {
    throw AppError.notFound('Jugador no encontrado', 'PLAYER_NOT_FOUND')
  }

  const updateData: Record<string, unknown> = {
    role: newRole
  }

  if (newRole === UserRole.Invitado) {
    updateData.inviterId = inviterId
    // Asignar foto genérica si no tiene
    if (!existingPlayer.photoUrl) {
      updateData.photoUrl = GUEST_PHOTO_URL
    }
  } else {
    // Si deja de ser Invitado, quitar invitador
    updateData.inviterId = null
  }

  const updatedPlayer = await prisma.player.update({
    where: { id },
    data: updateData,
    select: {
      ...PLAYER_ADMIN_SELECT,
      inviter: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  })

  invalidatePlayerTokens(id)

  return ok({
    message: `Rol cambiado exitosamente a ${newRole}`,
    player: updatedPlayer
  })
})
