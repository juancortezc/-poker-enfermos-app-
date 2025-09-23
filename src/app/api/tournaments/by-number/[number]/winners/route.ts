import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/tournaments/[number]/winners
 * Obtener ganadores de un torneo específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { number: string } }
) {
  try {
    const tournamentNumber = parseInt(params.number)
    
    if (isNaN(tournamentNumber)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid tournament number' 
        },
        { status: 400 }
      )
    }

    const winners = await prisma.tournamentWinners.findUnique({
      where: {
        tournamentNumber: tournamentNumber
      },
      include: {
        champion: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            isActive: true
          }
        },
        runnerUp: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            isActive: true
          }
        },
        thirdPlace: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            isActive: true
          }
        },
        siete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            isActive: true
          }
        },
        dos: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            isActive: true
          }
        }
      }
    })

    if (!winners) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Tournament ${tournamentNumber} not found` 
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: winners
    })

  } catch (error) {
    console.error('Error fetching tournament winners:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error fetching tournament winners' 
      },
      { status: 500 }
    )
  }
}