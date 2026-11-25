import { NextRequest } from 'next/server'
import { calendarDraftSchema } from '@poker/shared'
import { prisma } from '@/lib/prisma'
import { requireComision } from '@/lib/api-auth'
import { withErrorHandler } from '@/lib/errors'
import { ok, parseBody } from '@/lib/http'

const DRAFT_ID = 1

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireComision(request)
  const draft = await prisma.calendarDraft.findUnique({
    where: { id: DRAFT_ID }
  })

  return ok({ draft })
})

export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireComision(request)
  const { tournamentNumber, gameDates, approved } = await parseBody(request, calendarDraftSchema)

  const draft = await prisma.calendarDraft.upsert({
    where: { id: DRAFT_ID },
    create: {
      id: DRAFT_ID,
      tournamentNumber: tournamentNumber ?? null,
      gameDates,
      approved: approved ?? false,
      updatedBy: user.id
    },
    update: {
      tournamentNumber: tournamentNumber ?? null,
      gameDates,
      approved: approved ?? false,
      updatedBy: user.id
    }
  })

  return ok({ draft })
})

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  await requireComision(request)
  await prisma.calendarDraft.delete({
    where: { id: DRAFT_ID }
  }).catch(() => null)

  return ok(null)
})
