import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withComisionAuth } from '@/lib/api-auth'

// PATCH /api/multas/:id - Editar una multa (solo Comision)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(req, async (req) => {
    try {
      const { id } = await params
      const data = await req.json()
      const { reason, pointsPenalty, chipsAmount, moneyAmount, paid } = data

      const updateData: Record<string, unknown> = {}
      if (reason !== undefined) updateData.reason = reason
      if (pointsPenalty !== undefined) updateData.pointsPenalty = parseInt(pointsPenalty)
      if (chipsAmount !== undefined) updateData.chipsAmount = chipsAmount === null ? null : parseInt(chipsAmount)
      if (moneyAmount !== undefined) updateData.moneyAmount = moneyAmount === null ? null : parseFloat(moneyAmount)
      if (paid !== undefined) updateData.paid = paid

      const adjustment = await prisma.playerAdjustment.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          player: {
            select: { id: true, firstName: true, lastName: true, photoUrl: true }
          }
        }
      })

      return NextResponse.json(adjustment)
    } catch (error) {
      console.error('Error updating multa:', error)
      return NextResponse.json(
        { error: 'Error al actualizar multa' },
        { status: 500 }
      )
    }
  })
}

// DELETE /api/multas/:id - Eliminar una multa (solo Comision)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(req, async () => {
    try {
      const { id } = await params
      await prisma.playerAdjustment.delete({ where: { id: parseInt(id) } })
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error deleting multa:', error)
      return NextResponse.json(
        { error: 'Error al eliminar multa' },
        { status: 500 }
      )
    }
  })
}
