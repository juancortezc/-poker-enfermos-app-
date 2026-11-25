import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, validateApiAccess } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody, parseParams } from '@/lib/http'
import { idParamsSchema, proposalInputSchema } from '@poker/shared'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

type Ctx = { params: Promise<{ id: string }> }

const createdBySelect = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    role: true
  }
} as const

const notFound = () => AppError.notFound('Propuesta no encontrada')

// GET - Obtener propuesta específica
export const GET = withErrorHandler(async (request: NextRequest, { params }: Ctx) => {
  const { id } = parseParams(await params, idParamsSchema)

  const proposal = await prisma.proposalV2.findUnique({
    where: { id },
    include: { createdBy: createdBySelect }
  })

  if (!proposal) throw notFound()

  // Una propuesta inactiva solo la ven su autor y la Comision. Para el
  // resto no existe (404, no 403: no se confirma que el id exista).
  if (!proposal.isActive) {
    const user = await validateApiAccess(request).catch(() => null)
    const allowed = user && (user.role === 'Comision' || user.id === proposal.createdById)
    if (!allowed) throw notFound()
  }

  return ok({ proposal })
})

// PATCH - Editar propuesta (requiere autenticación y ownership/comisión)
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: Ctx) => {
  const user = await requireUser(request)
  const { id } = parseParams(await params, idParamsSchema)

  const existingProposal = await prisma.proposalV2.findUnique({ where: { id } })
  if (!existingProposal) throw notFound()

  // Solo el creador o Comisión pueden editar
  const canEdit = user.role === 'Comision' || existingProposal.createdById === user.id
  if (!canEdit) {
    throw AppError.forbidden('No tienes permisos para editar esta propuesta')
  }

  const { title, objective, situation, proposal, imageUrl } = await parseBody(request, proposalInputSchema)

  const updatedProposal = await prisma.proposalV2.update({
    where: { id },
    data: {
      title,
      objective,
      situation,
      proposal,
      imageUrl
    },
    include: { createdBy: createdBySelect }
  })

  return ok({ proposal: updatedProposal })
})

// DELETE - Eliminar propuesta (solo Comisión)
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: Ctx) => {
  const user = await requireUser(request)
  if (user.role !== 'Comision') {
    throw AppError.forbidden('Solo la Comisión puede eliminar propuestas')
  }

  const { id } = parseParams(await params, idParamsSchema)

  const existingProposal = await prisma.proposalV2.findUnique({ where: { id } })
  if (!existingProposal) throw notFound()

  await prisma.proposalV2.delete({ where: { id } })

  return ok({ message: 'Propuesta eliminada exitosamente' })
})
