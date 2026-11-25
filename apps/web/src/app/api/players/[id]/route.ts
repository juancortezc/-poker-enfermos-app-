import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { requireUser, requireComision, invalidatePlayerTokens } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody, parseParams } from '@/lib/http'
import { playerSelectForRole, PLAYER_ADMIN_SELECT } from '@/lib/player-select'
import { validateAndHashPin } from '@/lib/pin-utils'
import { playerIdParamsSchema, updatePlayerSchema } from '@poker/shared'

type Context = { params: Promise<{ id: string }> }

// GET /api/players/:id - Obtener jugador específico
export const GET = withErrorHandler(async (req: NextRequest, { params }: Context) => {
  const requester = await requireUser(req)
  const { id } = parseParams(await params, playerIdParamsSchema)

  const player = await prisma.player.findUnique({
    where: { id },
    select: {
      ...playerSelectForRole(requester?.role),
      inviter: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      },
      invitees: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          isActive: true
        }
      },
      _count: {
        select: {
          gameResults: true,
          eliminations: true,
          eliminationsGiven: true
        }
      }
    }
  })

  if (!player) {
    throw AppError.notFound('Jugador no encontrado', 'PLAYER_NOT_FOUND')
  }

  return ok(player)
})

// PUT /api/players/:id - Actualizar jugador
export const PUT = withErrorHandler(async (req: NextRequest, { params }: Context) => {
  const user = await requireComision(req)
  const { id } = parseParams(await params, playerIdParamsSchema)

  const {
    firstName,
    lastName,
    aliases,
    pin,
    birthDate,
    phone,
    email,
    role,
    inviterId,
    photoUrl,
    isActive,
    joinYear
  } = await parseBody(req, updatePlayerSchema)

  // Nadie se quita a si mismo la Comision ni se inactiva: se quedaria
  // afuera sin que otro lo decida.
  if (id === user.id) {
    if (role !== undefined && role !== UserRole.Comision) {
      throw AppError.forbidden('No puedes quitarte el rol Comisión a ti mismo', 'SELF_DEMOTION')
    }
    if (isActive === false) {
      throw AppError.forbidden('No puedes inactivarte a ti mismo', 'SELF_DEACTIVATION')
    }
  }

  // Verificar que el jugador existe
  const existingPlayer = await prisma.player.findUnique({
    where: { id },
    select: { id: true, role: true }
  })

  if (!existingPlayer) {
    throw AppError.notFound('Jugador no encontrado', 'PLAYER_NOT_FOUND')
  }

  // El apellido es opcional para invitados: se registran con un nombre de
  // referencia incompleto ("Sobrino Diego", "Carlos jr")
  const finalRole = role !== undefined ? role : existingPlayer.role

  if (lastName !== undefined && !lastName && finalRole !== UserRole.Invitado) {
    throw AppError.badRequest('El apellido es obligatorio', 'LAST_NAME_REQUIRED')
  }

  // Validar y hashear PIN si se proporciona
  let hashedPin: string | undefined = undefined
  if (pin !== undefined) {
    const pinValidation = await validateAndHashPin(pin, id)
    if (!pinValidation.success) {
      throw AppError.badRequest(pinValidation.error, 'INVALID_PIN')
    }
    hashedPin = pinValidation.hashedPin
  }

  // Preparar datos de actualización (firstName/lastName ya vienen recortados)
  const updateData: Record<string, unknown> = {}

  if (firstName !== undefined) updateData.firstName = firstName
  if (lastName !== undefined) updateData.lastName = lastName
  if (aliases !== undefined) {
    updateData.aliases = { set: aliases.map((alias) => alias.trim()).filter(Boolean) }
  }
  if (hashedPin !== undefined) updateData.pin = hashedPin
  if (birthDate !== undefined) updateData.birthDate = birthDate
  if (phone !== undefined) updateData.phone = phone
  if (email !== undefined) updateData.email = email
  if (role !== undefined) updateData.role = role
  if (photoUrl !== undefined) {
    updateData.photoUrl = (photoUrl ?? '').trim() || null
  }
  if (isActive !== undefined) updateData.isActive = isActive
  if (joinYear !== undefined) {
    updateData.joinYear = joinYear
    updateData.joinDate = joinYear.toString()
  }

  // Manejar inviterId según el rol
  if (role !== undefined) {
    if (role === UserRole.Invitado && inviterId) {
      updateData.inviterId = inviterId
    } else if (role !== UserRole.Invitado) {
      updateData.inviterId = null
    }
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
      },
      invitees: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          isActive: true
        }
      }
    }
  })

  // Rol, clave o estado nuevos: que el cache de tokens no siga con los viejos.
  invalidatePlayerTokens(id)

  return ok(updatedPlayer)
})

// DELETE /api/players/:id - Inactivar jugador (soft delete)
export const DELETE = withErrorHandler(async (req: NextRequest, { params }: Context) => {
  const user = await requireComision(req)
  const { id } = parseParams(await params, playerIdParamsSchema)

  if (id === user.id) {
    throw AppError.forbidden('No puedes inactivarte a ti mismo', 'SELF_DEACTIVATION')
  }

  const existingPlayer = await prisma.player.findUnique({
    where: { id },
    select: { id: true }
  })

  if (!existingPlayer) {
    throw AppError.notFound('Jugador no encontrado', 'PLAYER_NOT_FOUND')
  }

  const updatedPlayer = await prisma.player.update({
    where: { id },
    data: { isActive: false },
    select: PLAYER_ADMIN_SELECT
  })
  invalidatePlayerTokens(id)

  return ok({
    message: 'Jugador inactivado correctamente',
    player: updatedPlayer
  })
})
