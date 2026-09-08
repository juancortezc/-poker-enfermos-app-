import webpush from 'web-push'
import { prisma } from './prisma'

// Initialize VAPID configuration
let vapidConfigured = false

function ensureVapidConfiguration() {
  if (vapidConfigured) return

  // .trim(): las variables de entorno pueden llegar con saltos de línea o espacios
  // al pegarlas en el dashboard, y web-push rechaza la clave con
  // "Vapid public key must be a URL safe Base 64".
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()

  if (!publicKey || !privateKey) {
    console.warn('⚠️  VAPID keys not configured. Push notifications will not work.')
    return
  }

  try {
    webpush.setVapidDetails(
      'mailto:admin@poker-enfermos.com',
      publicKey,
      privateKey
    )
    vapidConfigured = true
    console.log('✅ VAPID keys configured successfully')
  } catch (error) {
    console.error('❌ Failed to configure VAPID keys:', error)
    throw error
  }
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

interface DeliverableSubscription {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * 404/410: el endpoint ya no existe — el navegador se desuscribió o caducó.
 * 403: la suscripción se creó con OTRO par de claves VAPID, así que el push
 * service nunca va a aceptar nuestros envíos para ella. Queda huérfana y hay
 * que registrarla de nuevo desde el dispositivo.
 */
function deadSubscriptionStatus(error: unknown): number | null {
  const statusCode = (error as { statusCode?: number })?.statusCode
  if (statusCode === 403 || statusCode === 404 || statusCode === 410) return statusCode
  if (error instanceof Error) {
    if (/\b(404|410)\b/.test(error.message)) return 410
    if (error.message.includes('invalid') || error.message.includes('expired')) return 410
  }
  return null
}

/**
 * Envía a un conjunto de suscripciones y desactiva las que quedaron muertas.
 *
 * Un 403 aislado significa suscripción huérfana, pero si TODAS fallan con 403
 * lo más probable es que las claves VAPID del servidor estén mal: en ese caso
 * no se desactiva nada, porque las suscripciones siguen siendo válidas y
 * borrarlas obligaría a todos a volver a activarlas a mano.
 */
async function deliverToSubscriptions(
  subscriptions: DeliverableSubscription[],
  notificationData: unknown
): Promise<number> {
  const payload = JSON.stringify(notificationData)

  const results = await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth }
          },
          payload
        )
        return { success: true, subscriptionId: subscription.id, deadStatus: null as number | null }
      } catch (error) {
        console.error(`Failed to send notification to subscription ${subscription.id}:`, error)
        return { success: false, subscriptionId: subscription.id, deadStatus: deadSubscriptionStatus(error) }
      }
    })
  )

  const successCount = results.filter((r) => r.success).length
  const serverKeysLookBroken = successCount === 0 && results.every((r) => r.deadStatus === 403)

  const toDeactivate = results
    .filter((r) => r.deadStatus !== null && !(r.deadStatus === 403 && serverKeysLookBroken))
    .map((r) => r.subscriptionId)

  if (toDeactivate.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: { id: { in: toDeactivate } },
      data: { isActive: false }
    })
    console.log(`Desactivadas ${toDeactivate.length} suscripciones push muertas`)
  }

  if (serverKeysLookBroken) {
    console.error('Todas las suscripciones respondieron 403: revisar VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY del servidor')
  }

  return successCount
}

/**
 * Send push notification to a specific player
 */
export async function sendPushNotification(
  playerId: string,
  payload: PushNotificationPayload
): Promise<PushResult> {
  try {
    ensureVapidConfiguration()
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
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/icon-192.png',
      data: {
        url: payload.url,
        ...payload.data
      },
      actions: payload.actions,
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
      tag: payload.tag
    }

    const successCount = await deliverToSubscriptions(subscriptions, notificationData)

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
    ensureVapidConfiguration()
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
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/icon-192.png',
      data: {
        url: payload.url,
        ...payload.data
      },
      actions: payload.actions,
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
      tag: payload.tag
    }

    const successCount = await deliverToSubscriptions(subscriptions, notificationData)

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
  return process.env.VAPID_PUBLIC_KEY?.trim() || null
}