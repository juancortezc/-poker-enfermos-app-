import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseParams } from '@/lib/http'
import { idParamsSchema } from '@poker/shared'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

type Ctx = { params: Promise<{ id: string }> }

/** Cierra (true) o reabre (false) la votación. Solo Comisión. */
async function setVotingClosed(request: NextRequest, params: Ctx['params'], votingClosed: boolean) {
  const user = await requireUser(request)
  if (user.role !== 'Comision') {
    throw AppError.forbidden(
      votingClosed ? 'Solo la Comisión puede cerrar la votación' : 'Solo la Comisión puede reabrir la votación'
    )
  }

  const { id } = parseParams(await params, idParamsSchema)

  const existingProposal = await prisma.proposalV2.findUnique({ where: { id } })
  if (!existingProposal) {
    throw AppError.notFound('Propuesta no encontrada')
  }

  const updatedProposal = await prisma.proposalV2.update({
    where: { id },
    data: { votingClosed },
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
    proposal: updatedProposal,
    message: votingClosed ? 'Votación cerrada exitosamente' : 'Votación reabierta exitosamente'
  })
}

// PATCH - Cerrar votación (Solo Comisión)
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: Ctx) =>
  setVotingClosed(request, params, true)
)

// PUT - Reabrir votación (Solo Comisión)
export const PUT = withErrorHandler(async (request: NextRequest, { params }: Ctx) =>
  setVotingClosed(request, params, false)
)
