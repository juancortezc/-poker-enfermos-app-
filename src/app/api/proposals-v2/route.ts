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

    // Return empty array instead of error to prevent UI breaking
    return NextResponse.json({
      proposals: [],
      count: 0
    })
  }
}

// POST - Crear nueva propuesta (requiere autenticación)
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { title, objective, situation, proposal, imageUrl } = await req.json()

      // Validaciones básicas
      if (!title || !objective || !situation || !proposal) {
        return NextResponse.json(
          { error: 'Título, objetivo, situación y propuesta son obligatorios' },
          { status: 400 }
        )
      }

      // Validaciones de longitud
      if (title.length > 200) {
        return NextResponse.json(
          { error: 'El título no puede exceder 200 caracteres' },
          { status: 400 }
        )
      }

      if (objective.length > 1000) {
        return NextResponse.json(
          { error: 'El objetivo no puede exceder 1000 caracteres' },
          { status: 400 }
        )
      }

      if (situation.length > 2000) {
        return NextResponse.json(
          { error: 'La situación a modificar no puede exceder 2000 caracteres' },
          { status: 400 }
        )
      }

      if (proposal.length > 3000) {
        return NextResponse.json(
          { error: 'La propuesta no puede exceder 3000 caracteres' },
          { status: 400 }
        )
      }

      // Validar URL de imagen si se proporciona
      if (imageUrl && imageUrl.trim()) {
        try {
          new URL(imageUrl.trim())
        } catch {
          return NextResponse.json(
            { error: 'La URL de la imagen no es válida' },
            { status: 400 }
          )
        }
      }

      // Crear propuesta
      const newProposal = await prisma.proposalV2.create({
        data: {
          title: String(title).trim(),
          objective: String(objective).trim(),
          situation: String(situation).trim(),
          proposal: String(proposal).trim(),
          imageUrl: imageUrl && imageUrl.trim() ? String(imageUrl).trim() : null,
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

      return NextResponse.json({ proposal: newProposal }, { status: 201 })
    } catch (error) {
      console.error('Error creating proposal v2:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}