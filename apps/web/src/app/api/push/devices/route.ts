import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { isExpoPushToken } from '@/lib/expo-push'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

const PLATFORMS = ['ios', 'android'] as const
type Platform = (typeof PLATFORMS)[number]

async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
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
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await readJson(req)
      const expoToken = body.expoToken
      const platform = body.platform

      if (!isExpoPushToken(expoToken)) {
        return NextResponse.json({ error: 'expoToken inválido' }, { status: 400 })
      }
      if (typeof platform !== 'string' || !PLATFORMS.includes(platform as Platform)) {
        return NextResponse.json({ error: "platform debe ser 'ios' o 'android'" }, { status: 400 })
      }

      const now = new Date()
      const device = await prisma.pushDevice.upsert({
        where: { expoToken },
        create: { playerId: user.id, expoToken, platform, enabled: true, lastSeenAt: now },
        update: { playerId: user.id, platform, enabled: true, lastSeenAt: now },
        select: { id: true, platform: true, enabled: true, createdAt: true, lastSeenAt: true }
      })

      return NextResponse.json({ success: true, device })
    } catch (error) {
      console.error('Error registrando dispositivo push:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
  })
}

/**
 * DELETE /api/push/devices — da de baja el token (logout o permiso revocado).
 * El token va en el body `{ expoToken }` o en `?expoToken=`. Solo afecta a
 * dispositivos del jugador autenticado.
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const fromQuery = new URL(req.url).searchParams.get('expoToken')
      const expoToken = fromQuery ?? (await readJson(req)).expoToken

      if (!isExpoPushToken(expoToken)) {
        return NextResponse.json({ error: 'expoToken inválido' }, { status: 400 })
      }

      const { count } = await prisma.pushDevice.updateMany({
        where: { expoToken, playerId: user.id },
        data: { enabled: false }
      })

      return NextResponse.json({ success: true, disabled: count })
    } catch (error) {
      console.error('Error dando de baja dispositivo push:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
  })
}
