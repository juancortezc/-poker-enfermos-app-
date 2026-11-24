import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { sendNotificationIfEnabled } from '@/lib/notification-config'
import { parseProposalInput } from '@/lib/proposal-input'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// GET - Obtener propuestas públicas (sin autenticación)
export async function GET() {
  try {
    const proposals = await prisma.proposalV2.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
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
      proposals,
      count: proposals.length
    })
  } catch (error) {
    console.error('Error fetching proposals v2:', error)

    // Return empty array instead of error to prevent UI breaking
    return NextResponse.json({
      proposals: [],
      count: 0
    })
  }
}

// POST - Crear nueva propuesta (requiere autenticación)
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
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

      // Crear propuesta
      const newProposal = await prisma.proposalV2.create({
        data: {
          title,
          objective,
          situation,
          proposal,
          imageUrl,
          createdById: user.id
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

      // Send notification about new proposal (if enabled)
      await sendNotificationIfEnabled(
        'proposal_created',
        '📝 Nueva Propuesta',
        `${newProposal.createdBy?.firstName} ${newProposal.createdBy?.lastName} ha creado una nueva propuesta: ${newProposal.title}`,
        {
          proposalId: newProposal.id,
          proposalTitle: newProposal.title,
          authorId: user.id,
          authorName: `${newProposal.createdBy?.firstName} ${newProposal.createdBy?.lastName}`,
          excludePlayerIds: [user.id] // Don't notify the proposal creator
        },
        user.id // Track who created the proposal
      )

      return NextResponse.json({ proposal: newProposal }, { status: 201 })
    } catch (error) {
      console.error('Error creating proposal v2:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}