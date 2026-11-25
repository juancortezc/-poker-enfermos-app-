import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, invalidatePlayerTokens } from '@/lib/api-auth'
import { validateAndHashPin } from '@/lib/pin-utils'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody } from '@/lib/http'
import { updateProfileSchema } from '@poker/shared'

// GET /api/profile - Obtener perfil del usuario autenticado
export const GET = withErrorHandler(async (req: NextRequest) => {
  return withAuth(req, async (req, user) => {
    const player = await prisma.player.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        aliases: true,
        pin: true, // Para mostrar si tiene PIN configurado
        birthDate: true,
        email: true,
        phone: true,
        photoUrl: true,
        role: true,
        lastVictoryDate: true,
      }
    })

    if (!player) {
      throw AppError.notFound('Usuario no encontrado', 'PLAYER_NOT_FOUND')
    }

    // No devolver el PIN real, solo indicar si está configurado
    const response = {
      ...player,
      pin: player.pin ? '****' : '' // Mostrar asteriscos si tiene PIN
    }

    return ok(response)
  })
})

// PUT /api/profile - Actualizar perfil del usuario autenticado
export const PUT = withErrorHandler(async (req: NextRequest) => {
  return withAuth(req, async (req, user) => {
    const { pin, birthDate, email, phone } = await parseBody(req, updateProfileSchema)

    // Preparar datos para actualizar
    const updateData: Record<string, unknown> = {}

    // La clave se normaliza (minúsculas, sin espacios) antes de validar,
    // comprobar que no esté en uso y hashear: igual que el login. Antes se
    // hasheaba tal cual y una clave con mayúsculas no volvía a entrar.
    if (typeof pin === 'string' && pin.trim() !== '') {
      const result = await validateAndHashPin(pin, user.id)
      if (!result.success) {
        throw AppError.badRequest(result.error, 'INVALID_PIN')
      }
      updateData.pin = result.hashedPin
    }

    if (birthDate !== undefined) {
      updateData.birthDate = birthDate
    }

    if (email !== undefined) {
      updateData.email = email || null
    }

    if (phone !== undefined) {
      updateData.phone = phone || null
    }

    // Actualizar usuario
    const updatedPlayer = await prisma.player.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        aliases: true,
        birthDate: true,
        email: true,
        phone: true,
        photoUrl: true,
        role: true,
      }
    })

    if (updateData.pin) invalidatePlayerTokens(user.id)

    return ok({
      message: 'Perfil actualizado correctamente',
      player: updatedPlayer
    })
  })
})