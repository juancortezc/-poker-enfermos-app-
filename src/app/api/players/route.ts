import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { withComisionAuth } from '@/lib/api-auth'
import { validateAndHashPin } from '@/lib/pin-utils'

// GET /api/players - Lista de jugadores con filtros (público para mostrar directorio)
export async function GET(req: NextRequest) {
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

    const isInvitado = role === UserRole.Invitado

    // Validaciones básicas.
    // Los invitados suelen registrarse con un nombre de referencia incompleto
    // ("Sobrino Diego", "Carlos jr"), por eso el apellido es opcional para ellos.
    if (!firstName || !role) {
      return NextResponse.json(
        { error: 'Nombre y rol son obligatorios' },
        { status: 400 }
      )
    }

    if (!isInvitado && !lastName) {
      return NextResponse.json(
        { error: 'El apellido es obligatorio' },
        { status: 400 }
      )
    }

    const finalLastName = typeof lastName === 'string' ? lastName.trim() : ''

    // Evitar invitados duplicados: el formulario se reintenta con frecuencia
    if (isInvitado) {
      const duplicate = await prisma.player.findFirst({
        where: {
          role: UserRole.Invitado,
          firstName: { equals: firstName.trim(), mode: 'insensitive' },
          lastName: { equals: finalLastName, mode: 'insensitive' }
        },
        select: { id: true }
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Ya existe un invitado con ese nombre' },
          { status: 409 }
        )
      }
    }

    // Validar y hashear PIN si se proporciona
    let hashedPin: string | null = null
    if (pin) {
      const pinValidation = await validateAndHashPin(pin)
      if (!pinValidation.success) {
        return NextResponse.json(
          { error: pinValidation.error },
          { status: 400 }
        )
      }
      hashedPin = pinValidation.hashedPin
    }

    // Para invitados, asignar foto genérica si no se proporciona
    let finalPhotoUrl = photoUrl
    if (isInvitado && !photoUrl) {
      finalPhotoUrl = 'https://storage.googleapis.com/poker-enfermos/pato.png'
    }

    // Generar adminKey para usuarios Comision
    let adminKey = null
    if (role === UserRole.Comision) {
      adminKey = `admin_${firstName.toLowerCase()}_${Math.random().toString(36).substring(2, 15)}`
    }

    const newPlayer = await prisma.player.create({
      data: {
        firstName: firstName.trim(),
        lastName: finalLastName,
        joinDate: (joinYear || new Date().getFullYear()).toString(),
        joinYear: joinYear || new Date().getFullYear(),
        role,
        aliases,
        pin: hashedPin,
        birthDate,
        phone,
        email,
        inviterId: isInvitado ? inviterId : null,
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