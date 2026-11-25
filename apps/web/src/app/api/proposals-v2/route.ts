import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/api-auth'
import { withErrorHandler } from '@/lib/errors'
import { ok, parseBody } from '@/lib/http'
import { sendNotificationIfEnabled } from '@/lib/notification-config'
import { proposalInputSchema } from '@poker/shared'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

const createdBySelect = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    role: true
  }
} as const

// GET - Obtener propuestas públicas (sin autenticación)
export const GET = withErrorHandler(async () => {
  try {
    const proposals = await prisma.proposalV2.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: createdBySelect }
    })

    return ok({
      proposals,
      count: proposals.length
    })
  } catch (error) {
    console.error('Error fetching proposals v2:', error)

    // Lista vacia en vez de error para no romper la UI (comportamiento previo)
    return ok({
      proposals: [],
      count: 0
    })
  }
})

// POST - Crear nueva propuesta (requiere autenticación)
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request)
  const { title, objective, situation, proposal, imageUrl } = await parseBody(request, proposalInputSchema)

  const newProposal = await prisma.proposalV2.create({
    data: {
      title,
      objective,
      situation,
      proposal,
      imageUrl,
      createdById: user.id
    },
    include: { createdBy: createdBySelect }
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

  return ok({ proposal: newProposal }, 201)
})
