import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Solo propuestas activas para la vista pública
    const proposals = await prisma.proposal.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        imageUrl: true,
        createdAt: true
      }
    })

    return NextResponse.json({ proposals })
  } catch (error) {
    console.error('Error fetching public proposals:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}