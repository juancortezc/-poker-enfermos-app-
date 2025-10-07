import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async () => {
    try {
      const { id } = await params
      const proposalId = parseInt(id)

      if (isNaN(proposalId)) {
        return NextResponse.json({ error: 'ID de propuesta inválido' }, { status: 400 })
      }

      const comments = await prisma.proposalV2Comment.findMany({
        where: { proposalId },
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({ comments })
    } catch (error) {
      console.error('Error fetching proposal comments:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params
      const proposalId = parseInt(id)

      if (isNaN(proposalId)) {
        return NextResponse.json({ error: 'ID de propuesta inválido' }, { status: 400 })
      }

      const { content } = await req.json()

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json({ error: 'El comentario no puede estar vacío' }, { status: 400 })
      }

      if (content.length > 500) {
        return NextResponse.json({ error: 'El comentario no puede exceder 500 caracteres' }, { status: 400 })
      }

      // Verify proposal exists
      const proposal = await prisma.proposalV2.findUnique({
        where: { id: proposalId }
      })

      if (!proposal) {
        return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
      }

      if (!proposal.isActive) {
        return NextResponse.json({ error: 'No se pueden comentar propuestas inactivas' }, { status: 403 })
      }

      if (proposal.votingClosed) {
        return NextResponse.json({ error: 'La votación ha sido cerrada para esta propuesta' }, { status: 403 })
      }

      const comment = await prisma.proposalV2Comment.create({
        data: {
          proposalId,
          playerId: user.id,
          content: content.trim()
        },
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      })

      return NextResponse.json({ comment }, { status: 201 })
    } catch (error) {
      console.error('Error creating proposal comment:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
  })
}
