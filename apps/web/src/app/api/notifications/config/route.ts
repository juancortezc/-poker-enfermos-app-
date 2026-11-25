import { NextRequest } from 'next/server'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody } from '@/lib/http'
import { notificationConfigSchema } from '@poker/shared'
import { withComisionAuth } from '@/lib/api-auth'
import {
  NOTIFICATION_EVENTS,
  getAllNotificationSettings,
  updateNotificationSettings,
  initializeDefaultSettings
} from '@/lib/notification-config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// GET - Get notification configuration
export const GET = withErrorHandler(async (request: NextRequest) => {
  return withComisionAuth(request, async () => {
    // Initialize default settings if needed
    await initializeDefaultSettings()

    // Get all current settings
    const settings = await getAllNotificationSettings()

    return ok({
      events: NOTIFICATION_EVENTS,
      settings
    })
  })
})

// POST - Update notification configuration
export const POST = withErrorHandler(async (request: NextRequest) => {
  return withComisionAuth(request, async (req) => {
    const { settings } = await parseBody(req, notificationConfigSchema)

    // Update each setting
    const updatePromises = Object.entries(settings).map(([eventType, eventSettings]) =>
      updateNotificationSettings(eventType, eventSettings as never)
    )

    const results = await Promise.all(updatePromises)
    const failedUpdates = results.filter(result => !result).length

    if (failedUpdates > 0) {
      throw AppError.internal(`No se pudieron guardar ${failedUpdates} ajustes`, 'SETTINGS_UPDATE_FAILED')
    }

    return ok({
      message: 'Notification configuration updated successfully'
    })
  })
})