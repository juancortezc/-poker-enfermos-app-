import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params
      const proposalId = parseInt(id, 10)
      if (Number.isNaN(proposalId)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
      }

      const body = await req.json().catch(() => ({}))
      const { title, content, imageUrl, isActive } = body as {
        title?: string
        content?: string
        imageUrl?: string
        isActive?: boolean
      }

      const updateData: Record<string, unknown> = {}

      if (typeof title === 'string') {
        updateData.title = title.trim()
      }
      if (typeof content === 'string') {
        updateData.content = content.trim()
      }
      if (typeof imageUrl === 'string') {
        updateData.imageUrl = imageUrl.trim() || null
      }
      if (typeof isActive === 'boolean') {
        updateData.isActive = isActive
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'Sin cambios a aplicar' }, { status: 400 })
      }

      // Verificar si la propuesta existe y obtener el creador
      const existingProposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        select: { createdById: true }
      })

      if (!existingProposal) {
        return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
      }

      // Verificar permisos: solo el creador o usuarios Comision pueden editar
      if (existingProposal.createdById !== user.id && user.role !== 'Comision') {
        return NextResponse.json({ error: 'No tienes permisos para editar esta propuesta' }, { status: 403 })
      }

      const proposal = await prisma.proposal.update({
        where: { id: proposalId },
        data: updateData,
      })

      return NextResponse.json({ proposal })
    } catch (error) {
      console.error('Error updating proposal:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
  })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params
      const proposalId = parseInt(id, 10)
      if (Number.isNaN(proposalId)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
      }

      // Verificar si la propuesta existe y obtener el creador
      const existingProposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        select: { createdById: true }
      })

      if (!existingProposal) {
        return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
      }

      // Verificar permisos: solo el creador o usuarios Comision pueden eliminar
      if (existingProposal.createdById !== user.id && user.role !== 'Comision') {
        return NextResponse.json({ error: 'No tienes permisos para eliminar esta propuesta' }, { status: 403 })
      }

      await prisma.proposal.delete({ where: { id: proposalId } })
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error deleting proposal:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
  })
}
