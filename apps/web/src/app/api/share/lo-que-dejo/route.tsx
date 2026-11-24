import { NextRequest } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import { buildLoQueDejoImage } from '@/lib/share-image'

export const dynamic = 'force-dynamic'

/**
 * GET /api/share/lo-que-dejo — PNG con los personajes de la fecha:
 * el Varon, el Malazo, quien mas bajo y quien mas subio.
 */
export async function GET(request: NextRequest) {
  return withComisionAuth(request, async () => buildLoQueDejoImage())
}
