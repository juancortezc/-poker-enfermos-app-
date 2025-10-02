import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Ensure Prisma connection
    await prisma.$connect()

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

    // Return empty array instead of error to prevent UI breaking
    return NextResponse.json({ proposals: [] })
  } finally {
    await prisma.$disconnect()
  }
}