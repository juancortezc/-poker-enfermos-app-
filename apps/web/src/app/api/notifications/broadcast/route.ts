import { NextRequest } from 'next/server'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody } from '@/lib/http'
import { broadcastNotificationSchema } from '@poker/shared'
import { withAuth } from '@/lib/api-auth'
import { broadcastPushNotification } from '@/lib/push-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

// POST - Broadcast notification to all users or filtered by role
export const POST = withErrorHandler(async (request: NextRequest) => {
  return withAuth(request, async (req, user) => {
    // Only Comision can broadcast notifications
    if (user.role !== 'Comision') {
      throw AppError.forbidden('Solo la Comisión puede enviar notificaciones masivas')
    }

    const data = await parseBody(req, broadcastNotificationSchema)

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
      throw AppError.internal(result.error || 'Error enviando notificaciones', 'NOTIFICATION_SEND_FAILED')
    }

    return ok({
      message: 'Notificaciones enviadas correctamente',
      sentTo: result.sentTo,
      totalSubscriptions: result.totalSubscriptions,
      targetRoles: data.targetRoles,
      excludedPlayers: data.excludePlayerIds?.length || 0
    })
  })
})