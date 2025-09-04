import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { withAuth, withComisionAuth } from '@/lib/api-auth'

// GET /api/players - Lista de jugadores con filtros
export async function GET(req: NextRequest) {
  return withAuth(req, async (req, user) => {
  try {
    const { searchParams } = new URL(req.url)
    const roleParam = searchParams.get('role')
    const search = searchParams.get('search')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: Record<string, unknown> = {}
    
    if (roleParam) {
      // Handle multiple roles separated by comma
      const roles = roleParam.split(',').map(r => r.trim() as UserRole)
      if (roles.length === 1) {
        where.role = roles[0]
      } else {
        where.role = { in: roles }
      }
    }
    
    if (!includeInactive) {
      where.isActive = true
    }

    if (search) {
      where.OR = [
        {
          firstName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          lastName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          aliases: {
            has: search
          }
        }
      ]
    }

    const players = await prisma.player.findMany({
      where,
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            invitees: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { firstName: 'asc' }
      ]
    })

    return NextResponse.json(players)
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json(
      { error: 'Error al obtener jugadores' },
      { status: 500 }
    )
  }
  })
}

// POST /api/players - Crear nuevo jugador
export async function POST(req: NextRequest) {
  return withComisionAuth(req, async (req) => {
  try {
    const data = await req.json()
    
    const {
      firstName,
      lastName,
      role,
      aliases = [],
      pin,
      birthDate,
      phone,
      email,
      inviterId,
      photoUrl,
      joinYear
    } = data

    // Validaciones básicas
    if (!firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Nombre, apellido y rol son obligatorios' },
        { status: 400 }
      )
    }

    // Validar PIN si se proporciona
    if (pin && !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'El PIN debe ser de 4 dígitos' },
        { status: 400 }
      )
    }

    // Para invitados, asignar foto genérica si no se proporciona
    let finalPhotoUrl = photoUrl
    if (role === UserRole.Invitado && !photoUrl) {
      finalPhotoUrl = 'https://storage.googleapis.com/poker-enfermos/pato.png'
    }

    // Generar adminKey para usuarios Comision
    let adminKey = null
    if (role === UserRole.Comision) {
      adminKey = `admin_${firstName.toLowerCase()}_${Math.random().toString(36).substring(2, 15)}`
    }

    const newPlayer = await prisma.player.create({
      data: {
        firstName,
        lastName,
        joinDate: (joinYear || new Date().getFullYear()).toString(),
        joinYear: joinYear || new Date().getFullYear(),
        role,
        aliases,
        pin,
        birthDate,
        phone,
        email,
        inviterId: role === UserRole.Invitado ? inviterId : null,
        photoUrl: finalPhotoUrl,
        adminKey: adminKey,
        isActive: true
      },
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json(newPlayer, { status: 201 })
  } catch (error) {
    console.error('Error creating player:', error)
    return NextResponse.json(
      { error: 'Error al crear jugador' },
      { status: 500 }
    )
  }
  })
}