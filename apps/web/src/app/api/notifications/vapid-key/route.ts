import { AppError, withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'
import { getVapidPublicKey } from '@/lib/push-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET - Get VAPID public key for client-side subscription
export const GET = withErrorHandler(async () => {
  const publicKey = getVapidPublicKey()

  if (!publicKey) {
    throw AppError.unavailable('Las notificaciones push no están configuradas', 'VAPID_NOT_CONFIGURED')
  }

  return ok({
    publicKey
  })
})