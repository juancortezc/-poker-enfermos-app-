import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseParams } from '@/lib/http'
import { idParamsSchema } from '@poker/shared'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// PUT - Toggle estado activo/inactivo de propuesta
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser(request)
  const { id } = parseParams(await params, idParamsSchema)

  const existingProposal = await prisma.proposalV2.findUnique({ where: { id } })
  if (!existingProposal) {
    throw AppError.notFound('Propuesta no encontrada')
  }

  // Solo el creador o Comisión pueden toggle
  const canToggle = user.role === 'Comision' || existingProposal.createdById === user.id
  if (!canToggle) {
    throw AppError.forbidden('No tienes permisos para modificar el estado de esta propuesta')
  }

  const updatedProposal = await prisma.proposalV2.update({
    where: { id },
    data: {
      isActive: !existingProposal.isActive
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

  const action = updatedProposal.isActive ? 'activada' : 'desactivada'

  return ok({
    proposal: updatedProposal,
    message: `Propuesta ${action} exitosamente`
  })
})
