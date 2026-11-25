import { prisma } from '@/lib/prisma'
import { withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

export const GET = withErrorHandler(async () => {
  try {
    // Solo propuestas activas para la vista pública (usando v2)
    const proposals = await prisma.proposalV2.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        objective: true,
        situation: true,
        proposal: true,
        imageUrl: true,
        votingClosed: true,
        createdAt: true,
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    })

    return ok({ proposals })
  } catch (error) {
    console.error('Error fetching public proposals:', error)

    // Lista vacia en vez de error para no romper la UI (comportamiento previo)
    return ok({ proposals: [] })
  }
})
