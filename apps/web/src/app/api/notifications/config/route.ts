import { NextRequest, NextResponse } from 'next/server'
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
export async function GET(request: NextRequest) {
  return withComisionAuth(request, async () => {
    try {
      // Initialize default settings if needed
      await initializeDefaultSettings()

      // Get all current settings
      const settings = await getAllNotificationSettings()

      return NextResponse.json({
        events: NOTIFICATION_EVENTS,
        settings
      })

    } catch (error) {
      console.error('Error getting notification config:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}

// POST - Update notification configuration
export async function POST(request: NextRequest) {
  return withComisionAuth(request, async (req) => {
    try {
      const { settings } = await req.json()

      if (!settings || typeof settings !== 'object') {
        return NextResponse.json(
          { error: 'Settings object is required' },
          { status: 400 }
        )
      }

      // Update each setting
      const updatePromises = Object.entries(settings).map(([eventType, eventSettings]) =>
        updateNotificationSettings(eventType, eventSettings as never)
      )

      const results = await Promise.all(updatePromises)
      const failedUpdates = results.filter(result => !result).length

      if (failedUpdates > 0) {
        return NextResponse.json(
          { error: `Failed to update ${failedUpdates} settings` },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Notification configuration updated successfully'
      })

    } catch (error) {
      console.error('Error updating notification config:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}