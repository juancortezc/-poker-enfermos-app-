import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/errors'
import { ok, parseBody, parseQuery } from '@/lib/http'
import { pushSubscriptionSchema, unsubscribeQuerySchema } from '@poker/shared'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// POST - Subscribe to push notifications
export const POST = withErrorHandler(async (request: NextRequest) => {
  return withAuth(request, async (req, user) => {
    const data = await parseBody(req, pushSubscriptionSchema)

    // Check if subscription already exists for this endpoint
    const existingSubscription = await prisma.pushSubscription.findUnique({
      where: { endpoint: data.subscription.endpoint }
    })

    if (existingSubscription) {
      // Update existing subscription to ensure it's active
      await prisma.pushSubscription.update({
        where: { endpoint: data.subscription.endpoint },
        data: {
          playerId: user.id,
          p256dh: data.subscription.keys.p256dh,
          auth: data.subscription.keys.auth,
          userAgent: data.userAgent,
          isActive: true,
          updatedAt: new Date()
        }
      })

      return ok({
        message: 'Subscription updated successfully'
      })
    }

    // Create new subscription
    await prisma.pushSubscription.create({
      data: {
        playerId: user.id,
        endpoint: data.subscription.endpoint,
        p256dh: data.subscription.keys.p256dh,
        auth: data.subscription.keys.auth,
        userAgent: data.userAgent,
        isActive: true
      }
    })

    return ok({
      message: 'Subscription created successfully'
    })
  })
})

// DELETE - Unsubscribe from push notifications
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  return withAuth(request, async (req, user) => {
    const { endpoint } = parseQuery(req, unsubscribeQuerySchema)

    // Deactivate subscription
    await prisma.pushSubscription.updateMany({
      where: {
        endpoint: endpoint,
        playerId: user.id
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    })

    return ok({
      message: 'Unsubscribed successfully'
    })
  })
})