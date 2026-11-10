import { NextRequest } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import { buildMalazosTorneoImage } from '@/lib/share-image'

export const dynamic = 'force-dynamic'

/**
 * GET /api/share/malazos-torneo — PNG de los dos ultimos de la tabla, que son
 * los 7/2 del torneo, con cuanto les falta para salir del fondo.
 */
export async function GET(request: NextRequest) {
  return withComisionAuth(request, async () => buildMalazosTorneoImage())
}
