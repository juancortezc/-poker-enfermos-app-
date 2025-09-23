import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/tournaments/winners
 * Obtener todos los ganadores históricos de torneos
 */
export async function GET() {
  try {
    const winners = await prisma.tournamentWinners.findMany({
      include: {
        champion: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            isActive: true,
            aliases: true
          }
        },
        runnerUp: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            isActive: true,
            aliases: true
          }
        },
        thirdPlace: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            isActive: true,
            aliases: true
          }
        },
        siete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            isActive: true,
            aliases: true
          }
        },
        dos: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            isActive: true,
            aliases: true
          }
        }
      },
      orderBy: {
        tournamentNumber: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: winners,
      total: winners.length
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