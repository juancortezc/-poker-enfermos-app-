import { NextRequest } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import { buildEliminaImage } from '@/lib/share-image'

export const dynamic = 'force-dynamic'

/**
 * GET /api/share/elimina — PNG de la tabla del torneo para mandar al grupo.
 * Solo lo generico: posicion, nombre y puntaje.
 */
export async function GET(request: NextRequest) {
  return withComisionAuth(request, async () => buildEliminaImage())
}
