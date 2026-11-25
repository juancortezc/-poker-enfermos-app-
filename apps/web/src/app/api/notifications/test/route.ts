import { NextRequest } from 'next/server'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody } from '@/lib/http'
import { testNotificationSchema } from '@poker/shared'
import { withComisionAuth } from '@/lib/api-auth'
import { broadcastPushNotification } from '@/lib/push-service'
import { logNotificationHistory } from '@/lib/notification-config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// POST - Send test notification
export const POST = withErrorHandler(async (request: NextRequest) => {
  return withComisionAuth(request, async (req, user) => {
    const data = await parseBody(req, testNotificationSchema)

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
      throw AppError.internal(result.error || 'No se pudo enviar la notificación de prueba', 'NOTIFICATION_SEND_FAILED')
    }

    return ok({
      message: 'Test notification sent successfully',
      sentTo: result.sentTo,
      totalSubscriptions: result.totalSubscriptions
    })
  })
})