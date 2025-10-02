import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// Create a new Prisma instance for this route
const prisma = new PrismaClient()

export async function GET() {
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

    // Return empty array instead of error to prevent UI breaking
    return NextResponse.json({ proposals: [] })
  }
}