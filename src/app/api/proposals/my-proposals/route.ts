import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // Obtener solo las propuestas creadas por el usuario actual
      const proposals = await prisma.proposal.findMany({
        where: { createdById: user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
          imageUrl: true,
          isActive: true,
          createdAt: true,
          createdById: true
        }
      })

      return NextResponse.json({ proposals })
    } catch (error) {
      console.error('Error fetching user proposals:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
  })
}