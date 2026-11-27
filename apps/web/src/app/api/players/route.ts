import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEcuadorToday } from '@/lib/date-utils'
import { UserRole } from '@prisma/client'
import { requireComision, validateApiAccess } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody, parseQuery } from '@/lib/http'
import { playerSelectForRole, PLAYER_ADMIN_SELECT } from '@/lib/player-select'
import { validateAndHashPin } from '@/lib/pin-utils'
import { assertNoDuplicateGuest } from '@/lib/guests'
import { GUEST_PHOTO_URL, createPlayerSchema, playersQuerySchema } from '@poker/shared'

// GET /api/players - Directorio de jugadores.
// Exige sesión: trae teléfono, email y cumpleaños de los socios. Lo que se
// devuelve depende de quién pregunta (ver player-select.ts). Nunca incluye
// `pin` ni `adminKey`.
export const GET = withErrorHandler(async (req: NextRequest) => {
  // `validateApiAccess` lanza `ValidacionNoDisponible` (AppError 503) cuando
  // no pudo comprobar la credencial (base caida, arranque en frio): sale como
  // 503 y no como 401, que habria cerrado la sesion por un tropiezo pasajero.
  const requester = await validateApiAccess(req)

  if (!requester) {
    throw AppError.unauthorized('Debes iniciar sesión para ver el directorio')
  }
  const { role: roles, search, includeInactive } = parseQuery(req, playersQuerySchema)

  const where: Record<string, unknown> = {}

  if (roles) {
    // Varios roles separados por coma
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
    select: {
      ...playerSelectForRole(requester.role),
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

  return ok(players)
})

// POST /api/players - Crear nuevo jugador
export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireComision(request)
  const {
    firstName,
    lastName,
    role,
    aliases,
    pin,
    birthDate,
    phone,
    email,
    inviterId,
    photoUrl,
    joinYear
  } = await parseBody(request, createPlayerSchema)

  const isInvitado = role === UserRole.Invitado

  // Los invitados llevan nombre y apellido reales (lo valida createPlayerSchema
  // con las mismas reglas que el alta rapida) y no se duplican: 409
  // DUPLICATE_GUEST con el existente si ya hay uno activo con ese nombre.
  const finalLastName = lastName ?? ''

  if (isInvitado) {
    await assertNoDuplicateGuest(prisma, firstName, finalLastName)
  }

  // Validar y hashear PIN si se proporciona
  let hashedPin: string | null = null
  if (pin) {
    const pinValidation = await validateAndHashPin(pin)
    if (!pinValidation.success) {
      throw AppError.badRequest(pinValidation.error, 'INVALID_PIN')
    }
    hashedPin = pinValidation.hashedPin
  }

  // Para invitados, asignar foto genérica si no se proporciona
  let finalPhotoUrl = photoUrl
  if (isInvitado && !photoUrl) {
    finalPhotoUrl = GUEST_PHOTO_URL
  }

  // Generar adminKey para usuarios Comision
  let adminKey = null
  if (role === UserRole.Comision) {
    adminKey = `admin_${firstName.toLowerCase()}_${Math.random().toString(36).substring(2, 15)}`
  }

  const newPlayer = await prisma.player.create({
    data: {
      firstName,
      lastName: finalLastName,
      joinDate: (joinYear || getEcuadorToday().year).toString(),
      joinYear: joinYear || getEcuadorToday().year,
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
    // select, nunca include: include devolvia el hash del pin y el adminKey.
    select: {
      ...PLAYER_ADMIN_SELECT,
      inviter: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  })

  return ok(newPlayer, 201)
})
