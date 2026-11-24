import { NextRequest, NextResponse } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import { broadcastPushNotification } from '@/lib/push-service'
import { logNotificationHistory } from '@/lib/notification-config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

interface TestNotificationRequest {
  title: string
  body: string
  targetRoles?: Array<'Comision' | 'Enfermo' | 'Invitado'>
  excludePlayerIds?: string[]
}

// POST - Send test notification
export async function POST(request: NextRequest) {
  return withComisionAuth(request, async (req, user) => {
    try {
      const data: TestNotificationRequest = await req.json()

      // Validate required fields
      if (!data.title || !data.body) {
        return NextResponse.json(
          { error: 'title and body are required' },
          { status: 400 }
        )
      }

      // Send test notification
      const result = await broadcastPushNotification({
        title: data.title,
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        url: '/admin',
        tag: 'test-notification',
        data: {
          test: true,
          timestamp: Date.now()
        }
      }, {
        targetRoles: data.targetRoles,
        excludePlayerIds: data.excludePlayerIds
      })

      // Log to history
      await logNotificationHistory({
        notificationType: 'test',
        title: data.title,
        body: data.body,
        sentTo: result.sentTo,
        totalSubscriptions: result.totalSubscriptions,
        success: result.success,
        errorMessage: result.error,
        sentByPlayerId: user.id,
        metadata: {
          targetRoles: data.targetRoles,
          excludePlayerIds: data.excludePlayerIds
        }
      })

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to send test notification' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully',
        sentTo: result.sentTo,
        totalSubscriptions: result.totalSubscriptions
      })

    } catch (error) {
      console.error('Error sending test notification:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}