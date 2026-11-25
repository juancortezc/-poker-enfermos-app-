import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { withComisionAuth, invalidatePlayerTokens } from '@/lib/api-auth'
import { PLAYER_ADMIN_SELECT } from '@/lib/player-select'
import { GUEST_PHOTO_URL } from '@poker/shared'

// PATCH /api/players/:id/role - Cambiar rol de jugador (solo Comisión)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(req, async (request, user) => {
    try {
      const { id } = await params
      const { newRole, inviterId } = await request.json()

    if (!newRole || !Object.values(UserRole).includes(newRole)) {
      return NextResponse.json(
        { error: 'Rol inválido' },
        { status: 400 }
      )
    }

    if (id === user.id && newRole !== UserRole.Comision) {
      return NextResponse.json(
        { error: 'No puedes quitarte el rol Comisión a ti mismo', code: 'SELF_DEMOTION' },
        { status: 403 }
      )
    }

    const existingPlayer = await prisma.player.findUnique({
      where: { id },
      select: { id: true, photoUrl: true }
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