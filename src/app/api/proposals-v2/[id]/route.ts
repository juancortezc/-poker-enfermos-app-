import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// GET - Obtener propuesta específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID de propuesta inválido' },
        { status: 400 }
      )
    }

    const proposal = await prisma.proposalV2.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    })

    if (!proposal) {
      return NextResponse.json(
        { error: 'Propuesta no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ proposal })
  } catch (error) {
    console.error('Error fetching proposal:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH - Editar propuesta (requiere autenticación y ownership/comisión)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, user) => {
    try {
      const id = parseInt(params.id)
      if (isNaN(id)) {
        return NextResponse.json(
          { error: 'ID de propuesta inválido' },
          { status: 400 }
        )
      }

      // Verificar que la propuesta existe y obtener ownership
      const existingProposal = await prisma.proposalV2.findUnique({
        where: { id }
      })

      if (!existingProposal) {
        return NextResponse.json(
          { error: 'Propuesta no encontrada' },
          { status: 404 }
        )
      }

      // Verificar permisos: Solo el creador o Comisión pueden editar
      const canEdit = user.role === 'Comision' || existingProposal.createdById === user.id

      if (!canEdit) {
        return NextResponse.json(
          { error: 'No tienes permisos para editar esta propuesta' },
          { status: 403 }
        )
      }

      const { title, objective, situation, proposal, imageUrl } = await req.json()

      // Validaciones básicas
      if (!title || !objective || !situation || !proposal) {
        return NextResponse.json(
          { error: 'Título, objetivo, situación y propuesta son obligatorios' },
          { status: 400 }
        )
      }

      // Validaciones de longitud
      if (title.length > 200) {
        return NextResponse.json(
          { error: 'El título no puede exceder 200 caracteres' },
          { status: 400 }
        )
      }

      if (objective.length > 1000) {
        return NextResponse.json(
          { error: 'El objetivo no puede exceder 1000 caracteres' },
          { status: 400 }
        )
      }

      if (situation.length > 2000) {
        return NextResponse.json(
          { error: 'La situación a modificar no puede exceder 2000 caracteres' },
          { status: 400 }
        )
      }

      if (proposal.length > 3000) {
        return NextResponse.json(
          { error: 'La propuesta no puede exceder 3000 caracteres' },
          { status: 400 }
        )
      }

      // Validar URL de imagen si se proporciona
      if (imageUrl && imageUrl.trim()) {
        try {
          new URL(imageUrl.trim())
        } catch {
          return NextResponse.json(
            { error: 'La URL de la imagen no es válida' },
            { status: 400 }
          )
        }
      }

      // Actualizar propuesta
      const updatedProposal = await prisma.proposalV2.update({
        where: { id },
        data: {
          title: String(title).trim(),
          objective: String(objective).trim(),
          situation: String(situation).trim(),
          proposal: String(proposal).trim(),
          imageUrl: imageUrl && imageUrl.trim() ? String(imageUrl).trim() : null
        },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      })

      return NextResponse.json({ proposal: updatedProposal })
    } catch (error) {
      console.error('Error updating proposal:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}

// DELETE - Eliminar propuesta (solo Comisión)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, user) => {
    try {
      // Solo Comisión puede eliminar propuestas
      if (user.role !== 'Comision') {
        return NextResponse.json(
          { error: 'Solo la Comisión puede eliminar propuestas' },
          { status: 403 }
        )
      }

      const id = parseInt(params.id)
      if (isNaN(id)) {
        return NextResponse.json(
          { error: 'ID de propuesta inválido' },
          { status: 400 }
        )
      }

      // Verificar que la propuesta existe
      const existingProposal = await prisma.proposalV2.findUnique({
        where: { id }
      })

      if (!existingProposal) {
        return NextResponse.json(
          { error: 'Propuesta no encontrada' },
          { status: 404 }
        )
      }

      // Eliminar propuesta
      await prisma.proposalV2.delete({
        where: { id }
      })

      return NextResponse.json({ message: 'Propuesta eliminada exitosamente' })
    } catch (error) {
      console.error('Error deleting proposal:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}