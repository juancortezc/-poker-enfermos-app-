import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// PUT - Toggle estado activo/inactivo de propuesta
export async function PUT(
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

      // Verificar permisos: Solo el creador o Comisión pueden toggle
      const canToggle = user.role === 'Comision' || existingProposal.createdById === user.id

      if (!canToggle) {
        return NextResponse.json(
          { error: 'No tienes permisos para modificar el estado de esta propuesta' },
          { status: 403 }
        )
      }

      // Toggle el estado
      const updatedProposal = await prisma.proposalV2.update({
        where: { id },
        data: {
          isActive: !existingProposal.isActive
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

      const action = updatedProposal.isActive ? 'activada' : 'desactivada'

      return NextResponse.json({
        proposal: updatedProposal,
        message: `Propuesta ${action} exitosamente`
      })
    } catch (error) {
      console.error('Error toggling proposal status:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}