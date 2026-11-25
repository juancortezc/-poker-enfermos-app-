import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withComisionAuth } from '@/lib/api-auth'
import { withErrorHandler } from '@/lib/errors'
import { ok, parseBody, parseParams } from '@/lib/http'
import { idParamsSchema, updateMultaSchema } from '@poker/shared'

// PATCH /api/multas/:id - Editar una multa (solo Comision)
export const PATCH = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withComisionAuth(req, async (req) => {
    const { id } = parseParams(await params, idParamsSchema)
    const { reason, pointsPenalty, chipsAmount, moneyAmount, paid } = await parseBody(req, updateMultaSchema)

    const updateData: Record<string, unknown> = {}
    if (reason !== undefined) updateData.reason = reason
    if (pointsPenalty !== undefined) updateData.pointsPenalty = pointsPenalty
    if (chipsAmount !== undefined) updateData.chipsAmount = chipsAmount
    if (moneyAmount !== undefined) updateData.moneyAmount = moneyAmount
    if (paid !== undefined) updateData.paid = paid

    const adjustment = await prisma.playerAdjustment.update({
      where: { id },
      data: updateData,
      include: {
        player: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true }
        }
      }
    })

    return ok(adjustment)
  })
})

// DELETE /api/multas/:id - Eliminar una multa (solo Comision)
export const DELETE = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withComisionAuth(req, async () => {
    const { id } = parseParams(await params, idParamsSchema)
    // Si no existe, Prisma P2025 -> 404 (withErrorHandler).
    await prisma.playerAdjustment.delete({ where: { id } })
    return ok(null)
  })
})
