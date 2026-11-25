import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireComision } from '@/lib/api-auth'
import { withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireComision(request)

  // Obtener el último número de torneo
  const lastTournament = await prisma.tournament.findFirst({
    orderBy: { number: 'desc' },
    select: { number: true }
  })

  const nextNumber = lastTournament ? lastTournament.number + 1 : 28

  return ok({ nextNumber })
})
