import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { withAuth, withComisionAuth } from '@/lib/api-auth'

// GET /api/players/:id - Obtener jugador específico
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_req) => {
  try {
    const { id } = await params

    const player = await prisma.player.findUnique({
      where: { id },
      include: {
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
      return NextResponse.json(
        { error: 'Jugador no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(player)
  } catch (error) {
    console.error('Error fetching player:', error)
    return NextResponse.json(
      { error: 'Error al obtener jugador' },
      { status: 500 }
    )
  }
  })
}

// PUT /api/players/:id - Actualizar jugador
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(req, async (_req) => {
  try {
    const { id } = await params
    const data = await req.json()

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
    } = data

    // Validaciones básicas
    if (firstName !== undefined && !firstName.trim()) {
      return NextResponse.json(
        { error: 'El nombre es obligatorio' },
        { status: 400 }
      )
    }

    if (lastName !== undefined && !lastName.trim()) {
      return NextResponse.json(
        { error: 'El apellido es obligatorio' },
        { status: 400 }
      )
    }

    // Validar PIN si se proporciona
    if (pin && !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'El PIN debe ser de 4 dígitos' },
        { status: 400 }
      )
    }

    // Verificar que el jugador existe
    const existingPlayer = await prisma.player.findUnique({
      where: { id }
    })

    if (!existingPlayer) {
      return NextResponse.json(
        { error: 'Jugador no encontrado' },
        { status: 404 }
      )
    }

    // Preparar datos de actualización
    const updateData: Record<string, unknown> = {}
    
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (aliases !== undefined) updateData.aliases = aliases
    if (pin !== undefined) updateData.pin = pin
    if (birthDate !== undefined) updateData.birthDate = birthDate
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (role !== undefined) updateData.role = role
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl
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
      include: {
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

    return NextResponse.json(updatedPlayer)
  } catch (error) {
    console.error('Error updating player:', error)
    return NextResponse.json(
      { error: 'Error al actualizar jugador' },
      { status: 500 }
    )
  }
  })
}

// DELETE /api/players/:id - Inactivar jugador (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(req, async (_req) => {
  try {
    const { id } = await params

    const existingPlayer = await prisma.player.findUnique({
      where: { id }
    })

    if (!existingPlayer) {
      return NextResponse.json(
        { error: 'Jugador no encontrado' },
        { status: 404 }
      )
    }

    const updatedPlayer = await prisma.player.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({
      message: 'Jugador inactivado correctamente',
      player: updatedPlayer
    })
  } catch (error) {
    console.error('Error deleting player:', error)
    return NextResponse.json(
      { error: 'Error al inactivar jugador' },
      { status: 500 }
    )
  }
  })
}