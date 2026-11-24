import { NextRequest } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import { buildUltimaFechaImage } from '@/lib/share-image'

export const dynamic = 'force-dynamic'

/**
 * GET /api/share/ultima-fecha — PNG del resumen de la ultima fecha cerrada.
 * Campeon, podio y Varon de la noche. Nada personal.
 */
export async function GET(request: NextRequest) {
  return withComisionAuth(request, async () => buildUltimaFechaImage())
}
