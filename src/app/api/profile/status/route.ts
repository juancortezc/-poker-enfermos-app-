import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { isProfileComplete } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/profile/status - Verificar si el perfil del usuario está completo
export async function GET(req: NextRequest) {
  return withAuth(req, async (req, user) => {
    try {
      const player = await prisma.player.findUnique({
        where: { id: user.id },
        select: {
          pin: true,
          birthDate: true,
          email: true,
          phone: true,
          requiresProfileUpdate: true,
        }
      })

      if (!player) {
        return Response.json(
          { message: 'Usuario no encontrado' },
          { status: 404 }
        )
      }

      const isComplete = isProfileComplete(player)

      return Response.json({
        isComplete,
        requiresUpdate: player.requiresProfileUpdate || !isComplete,
        missingFields: {
          pin: !player.pin,
          birthDate: !player.birthDate,
          email: !player.email,
          phone: !player.phone,
        }
      })
    } catch (error) {
      console.error('Error checking profile status:', error)
      return Response.json(
        { message: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}