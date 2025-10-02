import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withComisionAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true'

      const proposals = await prisma.proposal.findMany({
        where: includeInactive ? {} : { isActive: true },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({ proposals })
    } catch (error) {
      console.error('Error fetching proposals:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
  })
}

export async function POST(request: NextRequest) {
  return withComisionAuth(request, async (req) => {
    try {
      const { title, content, imageUrl } = await req.json()

      if (!title || !content) {
        return NextResponse.json({ error: 'Título y contenido son obligatorios' }, { status: 400 })
      }

      const proposal = await prisma.proposal.create({
        data: {
          title: String(title).trim(),
          content: String(content).trim(),
          imageUrl: imageUrl ? String(imageUrl).trim() : null,
        }
      })

      return NextResponse.json({ proposal }, { status: 201 })
    } catch (error) {
      console.error('Error creating proposal:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
  })
}
