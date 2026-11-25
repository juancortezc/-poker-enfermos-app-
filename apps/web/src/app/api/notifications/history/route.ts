import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/errors'
import { ok, parseQuery } from '@/lib/http'
import { notificationHistoryQuerySchema } from '@poker/shared'
import { withComisionAuth } from '@/lib/api-auth'
import { getNotificationHistory } from '@/lib/notification-config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// GET - Get notification history
export const GET = withErrorHandler(async (request: NextRequest) => {
  return withComisionAuth(request, async (req) => {
    // page >= 1, limit 1..100 (422 si no)
    const { page, limit, eventType } = parseQuery(req, notificationHistoryQuerySchema)

    const history = await getNotificationHistory(page, limit, eventType)

    return ok(history)
  })
})