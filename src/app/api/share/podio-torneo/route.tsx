import { NextRequest } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import { buildPodioTorneoImage } from '@/lib/share-image'

export const dynamic = 'force-dynamic'

/**
 * GET /api/share/podio-torneo — PNG con los tres primeros de la tabla:
 * el lider y sus dos escoltas, con sus fotos.
 */
export async function GET(request: NextRequest) {
  return withComisionAuth(request, async () => buildPodioTorneoImage())
}
