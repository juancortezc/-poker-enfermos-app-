import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// GET - Obtener todas las propuestas para admin (solo Comisión)
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // Solo Comisión puede ver todas las propuestas
      if (user.role !== 'Comision') {
        return NextResponse.json(
          { error: 'Solo la Comisión puede acceder a esta vista' },
          { status: 403 }
        )
      }

      // Obtener parámetros de query para filtros
      const { searchParams } = new URL(req.url)
      const includeInactive = searchParams.get('includeInactive') === 'true'
      const authorId = searchParams.get('authorId')

      // Construir filtros
      const where: Record<string, unknown> = {}

      if (!includeInactive) {
        where.isActive = true
      }

      if (authorId) {
        where.createdById = authorId
      }

      const proposals = await prisma.proposalV2.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      })

      return NextResponse.json({
        proposals,
        count: proposals.length
      })
    } catch (error) {
      console.error('Error fetching admin proposals:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}