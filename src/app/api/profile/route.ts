import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import bcrypt from 'bcryptjs'

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
      const body = await req.json()
      const { pin, birthDate, email, phone } = body

      // Validaciones
      if (pin && (typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin))) {
        return Response.json(
          { message: 'PIN debe ser de 4 dígitos numéricos' },
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

      // Verificar si el PIN ya está en uso por otro usuario
      if (pin) {
        const allUsers = await prisma.player.findMany({
          where: {
            pin: { not: null },
            NOT: { id: user.id },
            isActive: true
          },
          select: { pin: true }
        })

        // Verificar si algún usuario ya tiene este PIN
        for (const existingUser of allUsers) {
          if (existingUser.pin && await bcrypt.compare(pin, existingUser.pin)) {
            return Response.json(
              { message: 'Este PIN ya está en uso por otro usuario' },
              { status: 400 }
            )
          }
        }
      }

      // Preparar datos para actualizar
      const updateData: any = {}
      
      if (pin) {
        updateData.pin = await bcrypt.hash(pin, 10)
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