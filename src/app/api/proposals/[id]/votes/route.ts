import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { VoteType } from '@prisma/client'

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

      const votes = await prisma.proposalV2Vote.findMany({
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
        }
      })

      const voteStats = {
        thumbsUp: votes.filter(vote => vote.voteType === 'thumbsUp').length,
        thumbsDown: votes.filter(vote => vote.voteType === 'thumbsDown').length,
        total: votes.length
      }

      return NextResponse.json({ votes, stats: voteStats })
    } catch (error) {
      console.error('Error fetching proposal votes:', error)
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

      const { voteType } = await req.json()

      if (!voteType || !['thumbsUp', 'thumbsDown'].includes(voteType)) {
        return NextResponse.json({ error: 'Tipo de voto inválido' }, { status: 400 })
      }

      // Verify proposal exists and is active
      const proposal = await prisma.proposalV2.findUnique({
        where: { id: proposalId }
      })

      if (!proposal) {
        return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
      }

      if (!proposal.isActive) {
        return NextResponse.json({ error: 'No se pueden votar propuestas inactivas' }, { status: 403 })
      }

      if (proposal.votingClosed) {
        return NextResponse.json({ error: 'La votación ha sido cerrada para esta propuesta' }, { status: 403 })
      }

      // Use upsert to handle vote changes (user can change their vote)
      const vote = await prisma.proposalV2Vote.upsert({
        where: {
          proposalId_playerId: {
            proposalId,
            playerId: user.id
          }
        },
        update: {
          voteType: voteType as VoteType
        },
        create: {
          proposalId,
          playerId: user.id,
          voteType: voteType as VoteType
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

      // Get updated vote stats
      const allVotes = await prisma.proposalV2Vote.findMany({
        where: { proposalId }
      })

      const voteStats = {
        thumbsUp: allVotes.filter(v => v.voteType === 'thumbsUp').length,
        thumbsDown: allVotes.filter(v => v.voteType === 'thumbsDown').length,
        total: allVotes.length
      }

      return NextResponse.json({ vote, stats: voteStats }, { status: 201 })
    } catch (error) {
      console.error('Error creating/updating proposal vote:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
  })
}

export async function DELETE(
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

      // Delete user's vote
      await prisma.proposalV2Vote.deleteMany({
        where: {
          proposalId,
          playerId: user.id
        }
      })

      // Get updated vote stats
      const allVotes = await prisma.proposalV2Vote.findMany({
        where: { proposalId }
      })

      const voteStats = {
        thumbsUp: allVotes.filter(v => v.voteType === 'thumbsUp').length,
        thumbsDown: allVotes.filter(v => v.voteType === 'thumbsDown').length,
        total: allVotes.length
      }

      return NextResponse.json({ stats: voteStats })
    } catch (error) {
      console.error('Error deleting proposal vote:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
  })
}
