import { NextRequest } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import { buildAcumImage } from '@/lib/share-image'

export const dynamic = 'force-dynamic'

/**
 * GET /api/share/acum — PNG de la tabla ordenada por puntos reales, sin
 * descartar ninguna fecha. Incluye DIF: lo que el ELIMINA le quita a cada uno.
 */
export async function GET(request: NextRequest) {
  return withComisionAuth(request, async () => buildAcumImage())
}
