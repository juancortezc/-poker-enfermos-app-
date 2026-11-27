import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  EDITABLE_GAME_DATE_STATUSES,
  gameDateParticipantIds,
  idParamsSchema,
  isGameDateEditable,
  updateGameDateSchema,
} from '@poker/shared'
import { assertPlayersExist } from '@/lib/data-integrity'
import { requireComision } from '@/lib/api-auth'
import { parseToUTCNoon, validateTuesdayDate} from '@/lib/date-utils'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody, parseParams } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

// GET - Obtener detalles de una fecha específica
export const GET = withErrorHandler(async (request: NextRequest, { params }: Ctx) => {
  await requireComision(request)
  const { id: gameDateId } = parseParams(await params, idParamsSchema)

  const gameDate = await prisma.gameDate.findUnique({
    where: { id: gameDateId },
    include: {
      tournament: {
        select: {
          id: true,
          name: true,
          number: true
        }
      }
    }
  })

  if (!gameDate) {
    throw AppError.notFound('Fecha no encontrada', 'GAME_DATE_NOT_FOUND')
  }

  // Calcular participantes totales
  const totalParticipants = gameDate.playerIds.length

  return ok({
    gameDate: {
      ...gameDate,
      totalParticipants,
      playersCount: gameDate.playerIds.length
    }
  })
})

// PUT - Iniciar una fecha (cambiar status a in_progress e inicializar timer) o actualizar fecha configurada
export const PUT = withErrorHandler(async (request: NextRequest, { params }: Ctx) => {
  await requireComision(request)
  const { id: gameDateId } = parseParams(await params, idParamsSchema)
  const { action, playerIds, guestIds, scheduledDate } = await parseBody(request, updateGameDateSchema)

  // Handle start action
  if (action === 'start') {
    console.log(`[GAME DATE API] Starting game date ${gameDateId}...`);
    
    // Verificar que la fecha existe y está en estado CREATED
    const existingDate = await prisma.gameDate.findUnique({
      where: { id: gameDateId },
      include: {
        tournament: {
          include: {
            blindLevels: {
              orderBy: { level: 'asc' }
            }
          }
        }
      }
    })

    if (!existingDate) {
      throw AppError.notFound('Fecha no encontrada', 'GAME_DATE_NOT_FOUND')
    }

    if (existingDate.status !== 'CREATED') {
      console.log(`[GAME DATE API] Cannot start. Current status: ${existingDate.status}`);
      throw AppError.badRequest(
        `La fecha debe estar configurada para iniciar (estado actual: ${existingDate.status})`,
        'GAME_DATE_NOT_CREATED'
      )
    }
    
    console.log(`[GAME DATE API] Status check passed. Current status: ${existingDate.status}`);
    console.log(`[GAME DATE API] Player count: ${existingDate.playerIds.length}`);

    // Verificar que no hay otra fecha activa
    const activeDate = await prisma.gameDate.findFirst({
      where: { status: 'in_progress' }
    })

    if (activeDate) {
      throw AppError.badRequest('Ya hay una fecha en progreso', 'GAME_DATE_ALREADY_IN_PROGRESS')
    }

    // Usar transacción para asegurar consistencia
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar GameDate status y startTime
      const updatedGameDate = await tx.gameDate.update({
        where: { id: gameDateId },
        data: {
          status: 'in_progress',
          startTime: new Date()
        },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              number: true
            }
          }
        }
      })

      // 2. Arrancar el timer: un ancla en el nivel 1, nada mas.
      //
      // Antes se copiaba aqui la estructura de blinds entera dentro del
      // TimerState y se calculaba timeRemaining a mano. Eso dejaba dos
      // copias de la misma estructura que podian divergir si alguien la
      // editaba. Ahora el motor lee los blinds del torneo en cada consulta.
      const timerState = await tx.timerState.upsert({
        where: { gameDateId },
        create: {
          gameDateId,
          status: 'active',
          anchorLevel: existingDate.tournament.blindLevels[0]?.level ?? 1,
          anchorElapsedMs: 0,
          anchorAt: new Date()
        },
        update: {
          status: 'active',
          anchorLevel: existingDate.tournament.blindLevels[0]?.level ?? 1,
          anchorElapsedMs: 0,
          anchorAt: new Date()
        }
      })

      return { updatedGameDate, timerState }
    })

    console.log(`[GAME DATE API] Game date ${gameDateId} started successfully`);
    console.log(`[GAME DATE API] New status: ${result.updatedGameDate.status}`);
    
    return ok({
      gameDate: result.updatedGameDate,
      timerState: result.timerState
    })
  }

  // Handle update action
  if (action === 'update' && (playerIds || scheduledDate)) {
    // Verificar que la fecha existe y todavía no se jugó (pending o CREATED)
    const existingDate = await prisma.gameDate.findUnique({
      where: { id: gameDateId },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            number: true
          }
        }
      }
    })

    if (!existingDate) {
      throw AppError.notFound('Fecha no encontrada', 'GAME_DATE_NOT_FOUND')
    }

    // Antes solo CREATED: la pestaña Activar cambia el día de la próxima
    // fecha, que todavía está pendiente, y siempre fallaba.
    if (!isGameDateEditable(existingDate.status)) {
      throw AppError.badRequest(
        `Solo se pueden actualizar fechas pendientes o configuradas (estado actual: ${existingDate.status})`,
        'GAME_DATE_NOT_EDITABLE'
      )
    }

    // Validar fecha si se está actualizando
    if (scheduledDate) {
      const dateValidation = validateTuesdayDate(scheduledDate)
      if (!dateValidation.valid) {
        throw AppError.badRequest(dateValidation.message ?? 'Fecha inválida', 'INVALID_DATE')
      }
    }

    // Preparar datos para actualizar
    let updateData: Record<string, unknown> = {}
    
    // Actualizar participantes si se proporcionan
    if (playerIds) {
      const participantIds = gameDateParticipantIds(playerIds, guestIds)
      await assertPlayersExist(prisma, participantIds)
      const totalParticipants = participantIds.length
      updateData = {
        ...updateData,
        playerIds: participantIds,
        playersMin: Math.min(9, totalParticipants),
        playersMax: Math.max(24, totalParticipants)
      }
    }
    
    // Actualizar fecha si se proporciona
    if (scheduledDate) {
      updateData = {
        ...updateData,
        scheduledDate: parseToUTCNoon(scheduledDate)
      }
    }

    // Actualizar la fecha de juego
    const updatedGameDate = await prisma.gameDate.update({
      where: { id: gameDateId },
      data: updateData,
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            number: true
          }
        }
      }
    })

    return ok({
      gameDate: {
        ...updatedGameDate,
        totalParticipants: updatedGameDate.playerIds.length,
        playersCount: updatedGameDate.playerIds.length,
        guestIds: guestIds || []
      }
    })
  }

  throw AppError.badRequest('Acción no válida: update requiere playerIds o scheduledDate', 'INVALID_ACTION')
})

// DELETE - Eliminar una fecha que todavía no se jugó (pending o CREATED).
// Al borrarla, /available-dates la ofrece como `missingDate` para recrearla.
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: Ctx) => {
  const user = await requireComision(request)
  const { id: gameDateId } = parseParams(await params, idParamsSchema)

  // Verificar que la fecha existe
  const existingDate = await prisma.gameDate.findUnique({
    where: { id: gameDateId }
  })

  if (!existingDate) {
    throw AppError.notFound('Fecha no encontrada', 'GAME_DATE_NOT_FOUND')
  }

  if (!isGameDateEditable(existingDate.status)) {
    throw AppError.badRequest(
      `Solo se pueden eliminar fechas pendientes o configuradas (estado actual: ${existingDate.status})`,
      'GAME_DATE_NOT_EDITABLE'
    )
  }

  // Borrado condicionado al estado: si entre la lectura y aquí alguien la
  // inició, no se borra una fecha en curso.
  const { count } = await prisma.gameDate.deleteMany({
    where: { id: gameDateId, status: { in: [...EDITABLE_GAME_DATE_STATUSES] } }
  })
  if (count === 0) {
    throw AppError.conflict('La fecha cambió de estado y ya no se puede eliminar', 'GAME_DATE_NOT_EDITABLE')
  }

  console.log(`[GAME DATE API] Game date ${gameDateId} deleted successfully by user ${user.id}`)

  return ok({
    message: `Fecha ${existingDate.dateNumber} eliminada exitosamente`
  })
})