import { NextRequest } from 'next/server'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody } from '@/lib/http'
import { sendNotificationSchema } from '@poker/shared'
import { withAuth } from '@/lib/api-auth'
import { sendPushNotification } from '@/lib/push-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// POST - Send notification to specific player
export const POST = withErrorHandler(async (request: NextRequest) => {
  return withAuth(request, async (req, user) => {
    // Only Comision can send notifications
    if (user.role !== 'Comision') {
      throw AppError.forbidden('Solo la Comisión puede enviar notificaciones')
    }

    const data = await parseBody(req, sendNotificationSchema)

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
      throw AppError.internal(result.error || 'Error enviando notificación', 'NOTIFICATION_SEND_FAILED')
    }

    return ok({
      message: 'Notificación enviada correctamente',
      sentTo: result.sentTo,
      totalSubscriptions: result.totalSubscriptions
    })
  })
})