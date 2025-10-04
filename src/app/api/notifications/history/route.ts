import { NextRequest, NextResponse } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import { getNotificationHistory } from '@/lib/notification-config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// GET - Get notification history
export async function GET(request: NextRequest) {
  return withComisionAuth(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url)
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const eventType = searchParams.get('eventType') || undefined

      // Validate parameters
      if (page < 1 || limit < 1 || limit > 100) {
        return NextResponse.json(
          { error: 'Invalid pagination parameters' },
          { status: 400 }
        )
      }

      const history = await getNotificationHistory(page, limit, eventType)

      return NextResponse.json(history)

    } catch (error) {
      console.error('Error getting notification history:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}