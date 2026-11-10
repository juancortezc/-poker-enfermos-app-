import { NextRequest } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import { buildMalazoFechaImage } from '@/lib/share-image'

export const dynamic = 'force-dynamic'

/**
 * GET /api/share/malazo-fecha — PNG del 7/2 de la noche: el primero en salir
 * de la ultima fecha, el segundo y quien lo saco.
 */
export async function GET(request: NextRequest) {
  return withComisionAuth(request, async () => buildMalazoFechaImage())
}
