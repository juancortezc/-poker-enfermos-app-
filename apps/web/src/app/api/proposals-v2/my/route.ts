import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/api-auth'
import { withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// GET - Obtener mis propuestas (requiere autenticación)
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request)
  const proposals = await prisma.proposalV2.findMany({
    where: { createdById: user.id },
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

  return ok({
    proposals,
    count: proposals.length
  })
})
