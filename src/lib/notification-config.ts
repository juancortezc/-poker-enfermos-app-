import { prisma } from './prisma'
import { broadcastPushNotification } from './push-service'
import type { NotificationType } from '@prisma/client'

export interface NotificationEventSettings {
  isEnabled: boolean
  timing: 'immediate' | 'delayed'
  delayMinutes?: number
  targetRoles?: Array<'Comision' | 'Enfermo' | 'Invitado'>
  excludePlayerIds?: string[]
  customMessage?: {
    title?: string
    body?: string
  }
}

export interface NotificationEvent {
  eventType: string
  defaultSettings: NotificationEventSettings
  description: string
  category: 'tournament' | 'game' | 'timer' | 'proposals' | 'dates'
}

// Define all notification events with their default settings
export const NOTIFICATION_EVENTS: NotificationEvent[] = [
  // Tournament Events
  {
    eventType: 'tournament_activated',
    defaultSettings: {
      isEnabled: true,
      timing: 'immediate',
      targetRoles: ['Comision', 'Enfermo', 'Invitado']
    },
    description: 'When a tournament is activated',
    category: 'tournament'
  },
  {
    eventType: 'tournament_completed',
    defaultSettings: {
      isEnabled: true,
      timing: 'immediate',
      targetRoles: ['Comision', 'Enfermo', 'Invitado']
    },
    description: 'When a tournament is completed',
    category: 'tournament'
  },

  // Game Events
  {
    eventType: 'player_eliminated',
    defaultSettings: {
      isEnabled: true,
      timing: 'immediate',
      targetRoles: ['Comision', 'Enfermo', 'Invitado']
    },
    description: 'When a player is eliminated',
    category: 'game'
  },
  {
    eventType: 'winner_declared',
    defaultSettings: {
      isEnabled: true,
      timing: 'immediate',
      targetRoles: ['Comision', 'Enfermo', 'Invitado']
    },
    description: 'When a winner is declared',
    category: 'game'
  },
  {
    eventType: 'final_table',
    defaultSettings: {
      isEnabled: false,
      timing: 'immediate',
      targetRoles: ['Comision', 'Enfermo', 'Invitado']
    },
    description: 'When final table is reached (3 players)',
    category: 'game'
  },

  // Timer Events
  {
    eventType: 'blind_level_changed',
    defaultSettings: {
      isEnabled: false,
      timing: 'immediate',
      targetRoles: ['Comision', 'Enfermo']
    },
    description: 'When blind level changes',
    category: 'timer'
  },
  {
    eventType: 'blind_level_warning',
    defaultSettings: {
      isEnabled: false,
      timing: 'immediate',
      targetRoles: ['Comision', 'Enfermo']
    },
    description: '1 minute before blind level change',
    category: 'timer'
  },
  {
    eventType: 'timer_paused',
    defaultSettings: {
      isEnabled: false,
      timing: 'immediate',
      targetRoles: ['Comision', 'Enfermo']
    },
    description: 'When timer is paused',
    category: 'timer'
  },
  {
    eventType: 'timer_resumed',
    defaultSettings: {
      isEnabled: false,
      timing: 'immediate',
      targetRoles: ['Comision', 'Enfermo']
    },
    description: 'When timer is resumed',
    category: 'timer'
  },

  // Proposal Events
  {
    eventType: 'proposal_created',
    defaultSettings: {
      isEnabled: true,
      timing: 'immediate',
      targetRoles: ['Comision', 'Enfermo', 'Invitado']
    },
    description: 'When a new proposal is created',
    category: 'proposals'
  },
  {
    eventType: 'proposal_deadline',
    defaultSettings: {
      isEnabled: false,
      timing: 'immediate',
      targetRoles: ['Comision', 'Enfermo', 'Invitado']
    },
    description: 'When proposal voting deadline approaches',
    category: 'proposals'
  },

  // Date Events
  {
    eventType: 'game_date_created',
    defaultSettings: {
      isEnabled: true,
      timing: 'immediate',
      targetRoles: ['Comision', 'Enfermo', 'Invitado']
    },
    description: 'When a new game date is scheduled',
    category: 'dates'
  },
  {
    eventType: 'game_date_reminder_24h',
    defaultSettings: {
      isEnabled: false,
      timing: 'immediate',
      targetRoles: ['Comision', 'Enfermo']
    },
    description: '24 hours before game date',
    category: 'dates'
  },
  {
    eventType: 'game_date_reminder_2h',
    defaultSettings: {
      isEnabled: false,
      timing: 'immediate',
      targetRoles: ['Comision', 'Enfermo']
    },
    description: '2 hours before game date',
    category: 'dates'
  },
  {
    eventType: 'game_date_started',
    defaultSettings: {
      isEnabled: true,
      timing: 'immediate',
      targetRoles: ['Comision', 'Enfermo']
    },
    description: 'When a game date starts',
    category: 'dates'
  }
]

/**
 * Get notification settings for a specific event type
 */
export async function getNotificationSettings(eventType: string): Promise<NotificationEventSettings | null> {
  try {
    const setting = await prisma.notificationSettings.findUnique({
      where: { eventType }
    })

    if (!setting) {
      // Return default settings if not found
      const eventDef = NOTIFICATION_EVENTS.find(e => e.eventType === eventType)
      return eventDef?.defaultSettings || null
    }

    return setting.settings as NotificationEventSettings
  } catch (error) {
    console.error(`Error getting notification settings for ${eventType}:`, error)
    return null
  }
}

/**
 * Update notification settings for a specific event type
 */
export async function updateNotificationSettings(
  eventType: string,
  settings: NotificationEventSettings
): Promise<boolean> {
  try {
    await prisma.notificationSettings.upsert({
      where: { eventType },
      create: {
        eventType,
        isEnabled: settings.isEnabled,
        settings: settings as unknown as Record<string, unknown>
      },
      update: {
        isEnabled: settings.isEnabled,
        settings: settings as unknown as Record<string, unknown>,
        updatedAt: new Date()
      }
    })

    return true
  } catch (error) {
    console.error(`Error updating notification settings for ${eventType}:`, error)
    return false
  }
}

/**
 * Get all notification settings
 */
export async function getAllNotificationSettings(): Promise<Record<string, NotificationEventSettings>> {
  try {
    const settings = await prisma.notificationSettings.findMany()
    const result: Record<string, NotificationEventSettings> = {}

    // Initialize with default settings
    NOTIFICATION_EVENTS.forEach(event => {
      result[event.eventType] = event.defaultSettings
    })

    // Override with stored settings
    settings.forEach(setting => {
      if (setting.settings) {
        result[setting.eventType] = setting.settings as NotificationEventSettings
      }
    })

    return result
  } catch (error) {
    console.error('Error getting all notification settings:', error)
    return {}
  }
}

/**
 * Check if a specific event is enabled
 */
export async function isEventEnabled(eventType: string): Promise<boolean> {
  const settings = await getNotificationSettings(eventType)
  return settings?.isEnabled ?? false
}

/**
 * Send notification if event is enabled
 */
export async function sendNotificationIfEnabled(
  eventType: string,
  defaultTitle: string,
  defaultBody: string,
  metadata?: Record<string, unknown>,
  sentByPlayerId?: string
): Promise<{ success: boolean; sentTo: number; totalSubscriptions: number }> {
  try {
    // Check if event is enabled
    const settings = await getNotificationSettings(eventType)
    if (!settings?.isEnabled) {
      console.log(`Notification skipped: ${eventType} is disabled`)
      return { success: false, sentTo: 0, totalSubscriptions: 0 }
    }

    // Use custom message if provided, otherwise use default
    const title = settings.customMessage?.title || defaultTitle
    const body = settings.customMessage?.body || defaultBody

    // Extract excludePlayerIds from metadata if present
    const excludePlayerIds = metadata?.excludePlayerIds as string[] || settings.excludePlayerIds

    // Send notification
    const result = await broadcastPushNotification({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      url: '/',
      tag: eventType,
      data: {
        eventType,
        automatic: true,
        timestamp: Date.now(),
        ...metadata
      }
    }, {
      targetRoles: settings.targetRoles,
      excludePlayerIds
    })

    // Log to history
    await logNotificationHistory({
      eventType,
      notificationType: 'automatic',
      title,
      body,
      sentTo: result.sentTo,
      totalSubscriptions: result.totalSubscriptions,
      success: result.success,
      errorMessage: result.error,
      sentByPlayerId,
      metadata
    })

    return {
      success: result.success,
      sentTo: result.sentTo,
      totalSubscriptions: result.totalSubscriptions
    }

  } catch (error) {
    console.error(`Error sending notification for ${eventType}:`, error)

    // Log failed attempt
    await logNotificationHistory({
      eventType,
      notificationType: 'automatic',
      title: defaultTitle,
      body: defaultBody,
      sentTo: 0,
      totalSubscriptions: 0,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      sentByPlayerId,
      metadata
    })

    return { success: false, sentTo: 0, totalSubscriptions: 0 }
  }
}

/**
 * Log notification to history
 */
export async function logNotificationHistory({
  eventType,
  notificationType,
  title,
  body,
  sentTo,
  totalSubscriptions,
  success,
  errorMessage,
  sentByPlayerId,
  metadata
}: {
  eventType?: string
  notificationType: NotificationType
  title: string
  body: string
  sentTo: number
  totalSubscriptions: number
  success: boolean
  errorMessage?: string
  sentByPlayerId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await prisma.notificationHistory.create({
      data: {
        eventType,
        notificationType,
        title,
        body,
        sentTo,
        totalSubscriptions,
        success,
        errorMessage,
        sentByPlayerId,
        metadata: metadata as unknown as Record<string, unknown>
      }
    })
  } catch (error) {
    console.error('Error logging notification history:', error)
  }
}

/**
 * Get notification history with pagination
 */
export async function getNotificationHistory(
  page = 1,
  limit = 20,
  eventType?: string
): Promise<{
  history: Array<{
    id: string
    eventType: string | null
    notificationType: NotificationType
    title: string
    body: string
    sentTo: number
    totalSubscriptions: number
    success: boolean
    errorMessage: string | null
    sentBy: { firstName: string; lastName: string } | null
    createdAt: Date
  }>
  total: number
  pages: number
}> {
  try {
    const where = eventType ? { eventType } : {}

    const [history, total] = await Promise.all([
      prisma.notificationHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sentBy: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      prisma.notificationHistory.count({ where })
    ])

    return {
      history,
      total,
      pages: Math.ceil(total / limit)
    }
  } catch (error) {
    console.error('Error getting notification history:', error)
    return { history: [], total: 0, pages: 0 }
  }
}

/**
 * Initialize default notification settings
 */
export async function initializeDefaultSettings(): Promise<void> {
  try {
    const existingSettings = await prisma.notificationSettings.findMany()
    const existingEventTypes = new Set(existingSettings.map(s => s.eventType))

    const newSettings = NOTIFICATION_EVENTS
      .filter(event => !existingEventTypes.has(event.eventType))
      .map(event => ({
        eventType: event.eventType,
        isEnabled: event.defaultSettings.isEnabled,
        settings: event.defaultSettings as unknown as Record<string, unknown>
      }))

    if (newSettings.length > 0) {
      await prisma.notificationSettings.createMany({
        data: newSettings,
        skipDuplicates: true
      })
      console.log(`Initialized ${newSettings.length} default notification settings`)
    }
  } catch (error) {
    console.error('Error initializing default notification settings:', error)
  }
}