import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { broadcastPushNotification } from '@/lib/push-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface BroadcastNotificationRequest {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  actions?: Array<{ action: string; title: string }>
  requireInteraction?: boolean
  silent?: boolean
  tag?: string
  data?: Record<string, unknown>
  targetRoles?: Array<'Comision' | 'Enfermo' | 'Invitado'>
  excludePlayerIds?: string[]
}

// POST - Broadcast notification to all users or filtered by role
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // Only Comision can broadcast notifications
      if (user.role !== 'Comision') {
        return NextResponse.json(
          { error: 'Solo la Comisión puede enviar notificaciones masivas' },
          { status: 403 }
        )
      }

      const data: BroadcastNotificationRequest = await req.json()

      // Validate required fields
      if (!data.title || !data.body) {
        return NextResponse.json(
          { error: 'title y body son requeridos' },
          { status: 400 }
        )
      }

      // Send broadcast notification
      const result = await broadcastPushNotification({
        title: data.title,
        body: data.body,
        icon: data.icon || '/icons/icon-192x192.png',
        badge: data.badge || '/icons/badge-72x72.png',
        url: data.url,
        actions: data.actions,
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false,
        tag: data.tag,
        data: data.data
      }, {
        targetRoles: data.targetRoles,
        excludePlayerIds: data.excludePlayerIds
      })

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Error enviando notificaciones' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Notificaciones enviadas correctamente',
        sentTo: result.sentTo,
        totalSubscriptions: result.totalSubscriptions,
        targetRoles: data.targetRoles,
        excludedPlayers: data.excludePlayerIds?.length || 0
      })

    } catch (error) {
      console.error('Error broadcasting notification:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}