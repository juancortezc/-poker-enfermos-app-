import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { withComisionAuth } from '@/lib/api-auth'

// PATCH /api/players/:id/role - Cambiar rol de jugador (solo Comisión)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(req, async (request) => {
    try {
      const { id } = await params
      const { newRole, inviterId } = await request.json()

    if (!newRole || !Object.values(UserRole).includes(newRole)) {
      return NextResponse.json(
        { error: 'Rol inválido' },
        { status: 400 }
      )
    }

    const existingPlayer = await prisma.player.findUnique({
      where: { id }
    })

    if (!existingPlayer) {
      return NextResponse.json(
        { error: 'Jugador no encontrado' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {
      role: newRole
    }

    // Si cambia a Invitado, debe tener un invitador
    if (newRole === UserRole.Invitado) {
      if (!inviterId) {
        return NextResponse.json(
          { error: 'Los invitados deben tener un Enfermo que los invite' },
          { status: 400 }
        )
      }
      updateData.inviterId = inviterId
      // Asignar foto genérica si no tiene
      if (!existingPlayer.photoUrl) {
        updateData.photoUrl = 'https://storage.googleapis.com/poker-enfermos/pato.png'
      }
    } else {
      // Si deja de ser Invitado, quitar invitador
      updateData.inviterId = null
    }

    const updatedPlayer = await prisma.player.update({
      where: { id },
      data: updateData,
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

      return NextResponse.json({
        message: `Rol cambiado exitosamente a ${newRole}`,
        player: updatedPlayer
      })
    } catch (error) {
      console.error('Error changing player role:', error)
      return NextResponse.json(
        { error: 'Error al cambiar rol del jugador' },
        { status: 500 }
      )
    }
  })
}