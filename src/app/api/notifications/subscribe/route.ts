import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

interface SubscribeRequest {
  subscription: {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }
  userAgent?: string
}

// POST - Subscribe to push notifications
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const data: SubscribeRequest = await req.json()

      // Validate required fields
      if (!data.subscription?.endpoint || !data.subscription?.keys?.p256dh || !data.subscription?.keys?.auth) {
        return NextResponse.json(
          { error: 'Subscription data is incomplete' },
          { status: 400 }
        )
      }

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

        return NextResponse.json({
          success: true,
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

      return NextResponse.json({
        success: true,
        message: 'Subscription created successfully'
      })

    } catch (error) {
      console.error('Error handling push subscription:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}

// DELETE - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const endpoint = searchParams.get('endpoint')

      if (!endpoint) {
        return NextResponse.json(
          { error: 'Endpoint is required' },
          { status: 400 }
        )
      }

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

      return NextResponse.json({
        success: true,
        message: 'Unsubscribed successfully'
      })

    } catch (error) {
      console.error('Error handling push unsubscription:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}