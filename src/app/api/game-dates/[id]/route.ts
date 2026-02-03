import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withComisionAuth } from '@/lib/api-auth'
import { parseToUTCNoon, validateTuesdayDate, getEcuadorDate } from '@/lib/date-utils'

// GET - Obtener detalles de una fecha específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(request, async (_req, _user) => {
    try {
      const gameDateId = parseInt((await params).id)

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
        return NextResponse.json(
          { error: 'Fecha no encontrada' },
          { status: 404 }
        )
      }

      // Calcular participantes totales
      const totalParticipants = gameDate.playerIds.length

      return NextResponse.json({
        gameDate: {
          ...gameDate,
          totalParticipants,
          playersCount: gameDate.playerIds.length
        }
      })
    } catch (error) {
      console.error('Error fetching game date:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}

// PUT - Iniciar una fecha (cambiar status a in_progress e inicializar timer) o actualizar fecha configurada
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(request, async (_req, _user) => {
    try {
      const gameDateId = parseInt((await params).id)
      const body = await request.json()
      const { action, playerIds, guestIds, scheduledDate } = body

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
          return NextResponse.json(
            { error: 'Fecha no encontrada' },
            { status: 404 }
          )
        }

        if (existingDate.status !== 'CREATED') {
          console.log(`[GAME DATE API] Cannot start. Current status: ${existingDate.status}`);
          return NextResponse.json(
            { error: `La fecha debe estar configurada para iniciar (estado actual: ${existingDate.status})` },
            { status: 400 }
          )
        }
        
        console.log(`[GAME DATE API] Status check passed. Current status: ${existingDate.status}`);
        console.log(`[GAME DATE API] Player count: ${existingDate.playerIds.length}`);

        // Verificar que no hay otra fecha activa
        const activeDate = await prisma.gameDate.findFirst({
          where: { status: 'in_progress' }
        })

        if (activeDate) {
          return NextResponse.json(
            { error: 'Ya hay una fecha en progreso' },
            { status: 400 }
          )
        }

        // Usar transacción para asegurar consistencia
        const result = await prisma.$transaction(async (tx) => {
          // 1. Actualizar GameDate status y startTime (usar hora de Ecuador)
          const updatedGameDate = await tx.gameDate.update({
            where: { id: gameDateId },
            data: {
              status: 'in_progress',
              startTime: getEcuadorDate()
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

          // 2. Crear TimerState inicial (usar hora de Ecuador)
          const ecuadorNow = getEcuadorDate()
          const timerState = await tx.timerState.create({
            data: {
              gameDateId: gameDateId,
              status: 'active',
              currentLevel: 1,
              timeRemaining: existingDate.tournament.blindLevels[0]?.duration * 60 || 720, // en segundos
              startTime: ecuadorNow,
              levelStartTime: ecuadorNow,
              blindLevels: existingDate.tournament.blindLevels.map(level => ({
                level: level.level,
                smallBlind: level.smallBlind,
                bigBlind: level.bigBlind,
                duration: level.duration
              }))
            }
          })

          // 3. Crear TimerAction de inicio
          await tx.timerAction.create({
            data: {
              timerStateId: timerState.id,
              actionType: 'start',
              performedBy: _user.id,
              fromLevel: null,
              toLevel: 1,
              metadata: {
                totalPlayers: updatedGameDate.playerIds.length,
                startedAt: ecuadorNow
              }
            }
          })

          return { updatedGameDate, timerState }
        })

        console.log(`[GAME DATE API] Game date ${gameDateId} started successfully`);
        console.log(`[GAME DATE API] New status: ${result.updatedGameDate.status}`);
        
        return NextResponse.json({
          success: true,
          gameDate: result.updatedGameDate,
          timerState: result.timerState
        })
      }

      // Handle update action
      if (action === 'update' && (playerIds || scheduledDate)) {
        // Verificar que la fecha existe y está en estado CREATED
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
          return NextResponse.json(
            { error: 'Fecha no encontrada' },
            { status: 404 }
          )
        }

        if (existingDate.status !== 'CREATED') {
          return NextResponse.json(
            { error: `Solo se pueden actualizar fechas configuradas (estado actual: ${existingDate.status})` },
            { status: 400 }
          )
        }

        // Validar fecha si se está actualizando
        if (scheduledDate) {
          const dateValidation = validateTuesdayDate(scheduledDate)
          if (!dateValidation.valid) {
            return NextResponse.json(
              { error: dateValidation.message },
              { status: 400 }
            )
          }
        }

        // Preparar datos para actualizar
        let updateData: Record<string, unknown> = {}
        
        // Actualizar participantes si se proporcionan
        if (playerIds) {
          const totalParticipants = playerIds.length + (guestIds?.length || 0)
          updateData = {
            ...updateData,
            playerIds: playerIds,
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

        return NextResponse.json({
          success: true,
          gameDate: {
            ...updatedGameDate,
            totalParticipants: playerIds ? (playerIds.length + (guestIds?.length || 0)) : updatedGameDate.playerIds.length,
            playersCount: updatedGameDate.playerIds.length,
            guestIds: guestIds || []
          }
        })
      }

      return NextResponse.json(
        { error: 'Acción no válida' },
        { status: 400 }
      )
    } catch (error) {
      console.error('Error starting game date:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}

// DELETE - Eliminar una fecha en estado CREATED
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(request, async (_req, _user) => {
    try {
      const gameDateId = parseInt((await params).id)

      // Verificar que la fecha existe
      const existingDate = await prisma.gameDate.findUnique({
        where: { id: gameDateId }
      })

      if (!existingDate) {
        return NextResponse.json(
          { error: 'Fecha no encontrada' },
          { status: 404 }
        )
      }

      // Solo permitir eliminar fechas en estado CREATED
      if (existingDate.status !== 'CREATED') {
        return NextResponse.json(
          { error: `Solo se pueden eliminar fechas en estado CREATED (estado actual: ${existingDate.status})` },
          { status: 400 }
        )
      }

      // Eliminar la fecha
      await prisma.gameDate.delete({
        where: { id: gameDateId }
      })

      console.log(`[GAME DATE API] Game date ${gameDateId} deleted successfully by user ${_user.id}`)

      return NextResponse.json({
        success: true,
        message: `Fecha ${existingDate.dateNumber} eliminada exitosamente`
      })
    } catch (error) {
      console.error('Error deleting game date:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}