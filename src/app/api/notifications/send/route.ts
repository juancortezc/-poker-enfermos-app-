import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { sendPushNotification } from '@/lib/push-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

interface SendNotificationRequest {
  playerId: string
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
}

// POST - Send notification to specific player
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // Only Comision can send notifications
      if (user.role !== 'Comision') {
        return NextResponse.json(
          { error: 'Solo la Comisión puede enviar notificaciones' },
          { status: 403 }
        )
      }

      const data: SendNotificationRequest = await req.json()

      // Validate required fields
      if (!data.playerId || !data.title || !data.body) {
        return NextResponse.json(
          { error: 'playerId, title y body son requeridos' },
          { status: 400 }
        )
      }

      // Send notification
      const result = await sendPushNotification(data.playerId, {
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
      })

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Error enviando notificación' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Notificación enviada correctamente',
        sentTo: result.sentTo,
        totalSubscriptions: result.totalSubscriptions
      })

    } catch (error) {
      console.error('Error sending notification:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}