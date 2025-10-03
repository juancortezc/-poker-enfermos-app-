import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// GET - Obtener mis propuestas (requiere autenticación)
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const proposals = await prisma.proposalV2.findMany({
        where: { createdById: user.id },
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
      console.error('Error fetching my proposals:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}