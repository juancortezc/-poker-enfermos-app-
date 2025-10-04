import { NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/push-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET - Get VAPID public key for client-side subscription
export async function GET() {
  try {
    const publicKey = getVapidPublicKey()

    if (!publicKey) {
      return NextResponse.json(
        { error: 'VAPID keys not configured' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      publicKey
    })

  } catch (error) {
    console.error('Error getting VAPID public key:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}