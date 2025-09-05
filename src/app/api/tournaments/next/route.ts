import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

// GET /api/tournaments/next - No hay concepto de "próximo torneo", siempre retorna null
export async function GET(req: NextRequest) {
  return withAuth(req, async (req) => {
    try {
      // Con la nueva arquitectura, no hay torneos "próximos"
      // Solo existe un torneo activo a la vez
      return NextResponse.json({ tournament: null })
    } catch (error) {
      console.error('Error fetching next tournament:', error)
      return NextResponse.json(
        { error: 'Error al obtener próximo torneo' },
        { status: 500 }
      )
    }
  })
}