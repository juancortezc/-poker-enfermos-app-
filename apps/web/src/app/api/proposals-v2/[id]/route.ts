import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, validateApiAccess } from '@/lib/api-auth'
import { parseProposalInput } from '@/lib/proposal-input'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// GET - Obtener propuesta específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
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

    // Una propuesta inactiva solo la ven su autor y la Comision. Para el
    // resto no existe (404, no 403: no se confirma que el id exista).
    if (!proposal.isActive) {
      const user = await validateApiAccess(request).catch(() => null)
      const allowed = user && (user.role === 'Comision' || user.id === proposal.createdById)
      if (!allowed) {
        return NextResponse.json(
          { error: 'Propuesta no encontrada' },
          { status: 404 }
        )
      }
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params
  return withAuth(request, async (req, user) => {
    try {
      const id = parseInt(idParam)
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

      let body: unknown
      try {
        body = await req.json()
      } catch {
        return NextResponse.json({ error: 'El cuerpo de la solicitud no es JSON válido' }, { status: 400 })
      }
      const parsed = parseProposalInput(body)
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 })
      }
      const { title, objective, situation, proposal, imageUrl } = parsed.value

      // Actualizar propuesta
      const updatedProposal = await prisma.proposalV2.update({
        where: { id },
        data: {
          title,
          objective,
          situation,
          proposal,
          imageUrl
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params
  return withAuth(request, async (req, user) => {
    try {
      // Solo Comisión puede eliminar propuestas
      if (user.role !== 'Comision') {
        return NextResponse.json(
          { error: 'Solo la Comisión puede eliminar propuestas' },
          { status: 403 }
        )
      }

      const id = parseInt(idParam)
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