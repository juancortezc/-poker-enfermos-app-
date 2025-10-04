import webpush from 'web-push'
import { prisma } from './prisma'

// Configure VAPID keys - these should be generated and stored as environment variables
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.warn('⚠️  VAPID keys not configured. Push notifications will not work.')
} else {
  webpush.setVapidDetails(
    'mailto:admin@poker-enfermos.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export interface PushNotificationPayload {
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

export interface BroadcastOptions {
  targetRoles?: Array<'Comision' | 'Enfermo' | 'Invitado'>
  excludePlayerIds?: string[]
}

export interface PushResult {
  success: boolean
  sentTo: number
  totalSubscriptions: number
  error?: string
}

/**
 * Send push notification to a specific player
 */
export async function sendPushNotification(
  playerId: string,
  payload: PushNotificationPayload
): Promise<PushResult> {
  try {
    // Get active subscriptions for the player
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        playerId: playerId,
        isActive: true
      }
    })

    if (subscriptions.length === 0) {
      return {
        success: false,
        sentTo: 0,
        totalSubscriptions: 0,
        error: 'No active subscriptions found for player'
      }
    }

    const notificationData = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      data: {
        url: payload.url,
        ...payload.data
      },
      actions: payload.actions,
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
      tag: payload.tag
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth
              }
            },
            JSON.stringify(notificationData)
          )
          return { success: true, subscriptionId: subscription.id }
        } catch (error) {
          console.error(`Failed to send notification to subscription ${subscription.id}:`, error)

          // If subscription is invalid, deactivate it
          if (error instanceof Error && (
            error.message.includes('410') ||
            error.message.includes('invalid') ||
            error.message.includes('expired')
          )) {
            await prisma.pushSubscription.update({
              where: { id: subscription.id },
              data: { isActive: false }
            })
          }

          return { success: false, subscriptionId: subscription.id, error }
        }
      })
    )

    const successCount = results.filter(result =>
      result.status === 'fulfilled' && result.value.success
    ).length

    return {
      success: successCount > 0,
      sentTo: successCount,
      totalSubscriptions: subscriptions.length
    }

  } catch (error) {
    console.error('Error sending push notification:', error)
    return {
      success: false,
      sentTo: 0,
      totalSubscriptions: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Broadcast push notification to multiple users
 */
export async function broadcastPushNotification(
  payload: PushNotificationPayload,
  options: BroadcastOptions = {}
): Promise<PushResult> {
  try {
    // Build where clause for filtering subscriptions
    const whereClause: Record<string, unknown> = {
      isActive: true
    }

    // Filter by roles if specified
    if (options.targetRoles && options.targetRoles.length > 0) {
      whereClause.player = {
        role: {
          in: options.targetRoles
        }
      }
    }

    // Exclude specific players if specified
    if (options.excludePlayerIds && options.excludePlayerIds.length > 0) {
      whereClause.playerId = {
        notIn: options.excludePlayerIds
      }
    }

    // Get subscriptions based on filters
    const subscriptions = await prisma.pushSubscription.findMany({
      where: whereClause,
      include: {
        player: {
          select: {
            id: true,
            role: true
          }
        }
      }
    })

    // Count all eligible players even if they don't have active subscriptions
    const eligiblePlayersClause: Record<string, unknown> = {}

    if (options.targetRoles && options.targetRoles.length > 0) {
      eligiblePlayersClause.role = {
        in: options.targetRoles
      }
    }

    if (options.excludePlayerIds && options.excludePlayerIds.length > 0) {
      eligiblePlayersClause.id = {
        notIn: options.excludePlayerIds
      }
    }

    const eligiblePlayers = await prisma.player.count({
      where: eligiblePlayersClause
    })

    if (subscriptions.length === 0) {
      // Return success but indicate no actual notifications were sent
      return {
        success: true,
        sentTo: 0,
        totalSubscriptions: eligiblePlayers,
        error: `Mensaje preparado para ${eligiblePlayers} usuarios. Los usuarios deben activar notificaciones desde sus dispositivos para recibirlas.`
      }
    }

    const notificationData = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      data: {
        url: payload.url,
        ...payload.data
      },
      actions: payload.actions,
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
      tag: payload.tag
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth
              }
            },
            JSON.stringify(notificationData)
          )
          return { success: true, subscriptionId: subscription.id }
        } catch (error) {
          console.error(`Failed to send notification to subscription ${subscription.id}:`, error)

          // If subscription is invalid, deactivate it
          if (error instanceof Error && (
            error.message.includes('410') ||
            error.message.includes('invalid') ||
            error.message.includes('expired')
          )) {
            await prisma.pushSubscription.update({
              where: { id: subscription.id },
              data: { isActive: false }
            })
          }

          return { success: false, subscriptionId: subscription.id, error }
        }
      })
    )

    const successCount = results.filter(result =>
      result.status === 'fulfilled' && result.value.success
    ).length

    return {
      success: successCount > 0,
      sentTo: successCount,
      totalSubscriptions: Math.max(subscriptions.length, eligiblePlayers)
    }

  } catch (error) {
    console.error('Error broadcasting push notification:', error)
    return {
      success: false,
      sentTo: 0,
      totalSubscriptions: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null
}