import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withComisionAuth } from '@/lib/api-auth'

interface RouteParams {
  params: {
    id: string
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withComisionAuth(request, async (req) => {
    try {
      const proposalId = parseInt(params.id, 10)
      if (Number.isNaN(proposalId)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
      }

      const body = await req.json().catch(() => ({}))
      const { title, content, isActive } = body as {
        title?: string
        content?: string
        isActive?: boolean
      }

      const updateData: Record<string, unknown> = {}

      if (typeof title === 'string') {
        updateData.title = title.trim()
      }
      if (typeof content === 'string') {
        updateData.content = content.trim()
      }
      if (typeof isActive === 'boolean') {
        updateData.isActive = isActive
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'Sin cambios a aplicar' }, { status: 400 })
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
  return withComisionAuth(request, async () => {
    try {
      const proposalId = parseInt(params.id, 10)
      if (Number.isNaN(proposalId)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
      }

      await prisma.proposal.delete({ where: { id: proposalId } })
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error deleting proposal:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
  })
}
