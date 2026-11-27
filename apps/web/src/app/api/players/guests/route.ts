import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireComision } from '@/lib/api-auth'
import { withErrorHandler } from '@/lib/errors'
import { ok, parseBody } from '@/lib/http'
import { createGuest } from '@/lib/guests'
import { createGuestSchema } from '@poker/shared'

// POST /api/players/guests - Alta rapida de un invitado externo (solo Comision).
// Nombre y apellido reales + quien lo invita. 409 DUPLICATE_GUEST si ya hay un
// invitado activo con ese nombre (details.existingGuest para elegirlo).
export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireComision(request)
  const input = await parseBody(request, createGuestSchema)
  return ok(await createGuest(prisma, input), 201)
})
