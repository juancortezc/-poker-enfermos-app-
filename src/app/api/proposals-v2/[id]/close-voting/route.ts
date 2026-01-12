import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// PATCH - Cerrar votación (Solo Comisión)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params
  return withAuth(request, async (req, user) => {
    try {
      // Solo la Comisión puede cerrar votación
      if (user.role !== 'Comision') {
        return NextResponse.json(
          { error: 'Solo la Comisión puede cerrar la votación' },
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

      // Cerrar votación
      const updatedProposal = await prisma.proposalV2.update({
        where: { id },
        data: {
          votingClosed: true
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

      return NextResponse.json({
        proposal: updatedProposal,
        message: 'Votación cerrada exitosamente'
      })
    } catch (error) {
      console.error('Error closing voting:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}

// PUT - Reabrir votación (Solo Comisión)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params
  return withAuth(request, async (req, user) => {
    try {
      // Solo la Comisión puede reabrir votación
      if (user.role !== 'Comision') {
        return NextResponse.json(
          { error: 'Solo la Comisión puede reabrir la votación' },
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

      // Reabrir votación
      const updatedProposal = await prisma.proposalV2.update({
        where: { id },
        data: {
          votingClosed: false
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

      return NextResponse.json({
        proposal: updatedProposal,
        message: 'Votación reabierta exitosamente'
      })
    } catch (error) {
      console.error('Error reopening voting:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}
