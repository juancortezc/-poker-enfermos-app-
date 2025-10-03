import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

export async function GET() {
  try {
    // Solo propuestas activas para la vista pública (usando v2)
    const proposals = await prisma.proposalV2.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        objective: true,
        situation: true,
        proposal: true,
        imageUrl: true,
        createdAt: true,
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json({ proposals })
  } catch (error) {
    console.error('Error fetching public proposals:', error)

    // Return empty array instead of error to prevent UI breaking
    return NextResponse.json({ proposals: [] })
  }
}
