import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { validateAndHashPin, PIN_RULE_TEXT } from '@/lib/pin-utils'

// GET /api/profile - Obtener perfil del usuario autenticado
export async function GET(req: NextRequest) {
  return withAuth(req, async (req, user) => {
    try {
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
        return Response.json(
          { message: 'Usuario no encontrado' },
          { status: 404 }
        )
      }

      // No devolver el PIN real, solo indicar si está configurado
      const response = {
        ...player,
        pin: player.pin ? '****' : '' // Mostrar asteriscos si tiene PIN
      }

      return Response.json(response)
    } catch (error) {
      console.error('Error fetching profile:', error)
      return Response.json(
        { message: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}

// PUT /api/profile - Actualizar perfil del usuario autenticado
export async function PUT(req: NextRequest) {
  return withAuth(req, async (req, user) => {
    try {
      let body: unknown
      try {
        body = await req.json()
      } catch {
        return Response.json({ message: 'El cuerpo de la solicitud no es JSON válido' }, { status: 400 })
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return Response.json({ message: 'El cuerpo de la solicitud debe ser un objeto JSON' }, { status: 400 })
      }
      const { pin, birthDate, email, phone } = body as Record<string, unknown>

      // Validaciones
      if (pin !== undefined && pin !== null && pin !== '' && typeof pin !== 'string') {
        return Response.json(
          { message: `La clave debe tener ${PIN_RULE_TEXT.toLowerCase()}` },
          { status: 400 }
        )
      }

      if (birthDate && typeof birthDate !== 'string') {
        return Response.json(
          { message: 'Fecha de nacimiento inválida' },
          { status: 400 }
        )
      }

      if (email && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        return Response.json(
          { message: 'Correo electrónico inválido' },
          { status: 400 }
        )
      }

      if (phone !== undefined && phone !== null && typeof phone !== 'string') {
        return Response.json(
          { message: 'Teléfono inválido' },
          { status: 400 }
        )
      }

      // Preparar datos para actualizar
      const updateData: Record<string, unknown> = {}

      // La clave se normaliza (minúsculas, sin espacios) antes de validar,
      // comprobar que no esté en uso y hashear: igual que el login. Antes se
      // hasheaba tal cual y una clave con mayúsculas no volvía a entrar.
      if (typeof pin === 'string' && pin.trim() !== '') {
        const result = await validateAndHashPin(pin, user.id)
        if (!result.success) {
          return Response.json({ message: result.error }, { status: 400 })
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

      return Response.json({
        message: 'Perfil actualizado correctamente',
        player: updatedPlayer
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      return Response.json(
        { message: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}