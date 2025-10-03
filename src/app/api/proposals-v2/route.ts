import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

// GET - Obtener propuestas públicas (sin autenticación)
export async function GET() {
  try {
    const proposals = await prisma.proposalV2.findMany({
      where: { isActive: true },
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
    console.error('Error fetching proposals v2:', error)

    // Temporarily return the error to debug production issues
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      proposals: [],
      count: 0
    })
  }
}

// POST - Crear nueva propuesta (requiere autenticación)
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { title, content } = await req.json()

      // Validaciones básicas
      if (!title || !content) {
        return NextResponse.json(
          { error: 'Título y contenido son obligatorios' },
          { status: 400 }
        )
      }

      if (title.length > 200) {
        return NextResponse.json(
          { error: 'El título no puede exceder 200 caracteres' },
          { status: 400 }
        )
      }

      if (content.length > 5000) {
        return NextResponse.json(
          { error: 'El contenido no puede exceder 5000 caracteres' },
          { status: 400 }
        )
      }

      // Crear propuesta
      const proposal = await prisma.proposalV2.create({
        data: {
          title: String(title).trim(),
          content: String(content).trim(),
          createdById: user.id
        },
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

      return NextResponse.json({ proposal }, { status: 201 })
    } catch (error) {
      console.error('Error creating proposal v2:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}