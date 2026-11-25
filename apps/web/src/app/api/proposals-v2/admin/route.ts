import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseQuery } from '@/lib/http'
import { adminProposalsQuerySchema } from '@poker/shared'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// GET - Obtener todas las propuestas para admin (solo Comisión)
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request)
  if (user.role !== 'Comision') {
    throw AppError.forbidden('Solo la Comisión puede acceder a esta vista')
  }

  const { includeInactive, authorId } = parseQuery(request, adminProposalsQuerySchema)

  const where: Record<string, unknown> = {}
  if (!includeInactive) {
    where.isActive = true
  }
  if (authorId) {
    where.createdById = authorId
  }

  const proposals = await prisma.proposalV2.findMany({
    where,
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
