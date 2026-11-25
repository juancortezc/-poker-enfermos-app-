import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'
import { registerPushDeviceSchema, unregisterPushDeviceSchema } from '@poker/shared'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

/** Body JSON tolerante: un body ausente o roto cuenta como `{}` (la validacion dice que falta). */
async function readJsonLoose(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await req.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/**
 * POST /api/push/devices — registra (o actualiza) el token Expo de la app
 * móvil para el jugador autenticado. Body: { expoToken, platform }.
 *
 * El token es único por instalación: si ya existía (otro jugador entró en el
 * mismo teléfono, o el mismo vuelve a entrar) se reasigna al jugador actual y
 * se reactiva.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  return withAuth(request, async (req, user) => {
    const { expoToken, platform } = registerPushDeviceSchema.parse(await readJsonLoose(req))

    const now = new Date()
    const device = await prisma.pushDevice.upsert({
      where: { expoToken },
      create: { playerId: user.id, expoToken, platform, enabled: true, lastSeenAt: now },
      update: { playerId: user.id, platform, enabled: true, lastSeenAt: now },
      select: { id: true, platform: true, enabled: true, createdAt: true, lastSeenAt: true }
    })

    return ok({ device })
  })
})

/**
 * DELETE /api/push/devices — da de baja el token (logout o permiso revocado).
 * El token va en el body `{ expoToken }` o en `?expoToken=`. Solo afecta a
 * dispositivos del jugador autenticado.
 */
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  return withAuth(request, async (req, user) => {
    const fromQuery = new URL(req.url).searchParams.get('expoToken')
    const { expoToken } = unregisterPushDeviceSchema.parse({
      expoToken: fromQuery ?? (await readJsonLoose(req)).expoToken,
    })

    const { count } = await prisma.pushDevice.updateMany({
      where: { expoToken, playerId: user.id },
      data: { enabled: false }
    })

    return ok({ disabled: count })
  })
})
