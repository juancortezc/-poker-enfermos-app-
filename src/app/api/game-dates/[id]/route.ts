import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withComisionAuth } from '@/lib/api-auth'
import { parseToUTCNoon, validateTuesdayDate } from '@/lib/date-utils'

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
          // 1. Actualizar GameDate status y startTime
          const updatedGameDate = await tx.gameDate.update({
            where: { id: gameDateId },
            data: {
              status: 'in_progress',
              startTime: new Date() // Hora actual de Ecuador
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

          // 2. Crear TimerState inicial
          const timerState = await tx.timerState.create({
            data: {
              gameDateId: gameDateId,
              status: 'active',
              currentLevel: 1,
              timeRemaining: existingDate.tournament.blindLevels[0]?.duration * 60 || 720, // en segundos
              startTime: new Date(),
              levelStartTime: new Date(),
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
                startedAt: new Date()
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

// DELETE - Eliminar una fecha de juego y toda su data relacionada
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(request, async (_req, user) => {
    try {
      const gameDateId = parseInt((await params).id)
      
      console.log(`[DELETE GAME DATE] Starting deletion of GameDate ${gameDateId} by user ${user.id}`)

      // Verificar que la fecha existe
      const existingDate = await prisma.gameDate.findUnique({
        where: { id: gameDateId },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              number: true
            }
          },
          eliminations: true,
          timerStates: {
            include: {
              timerActions: true
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

      console.log(`[DELETE GAME DATE] Found GameDate ${gameDateId} - Status: ${existingDate.status}`)
      console.log(`[DELETE GAME DATE] Associated data - Eliminations: ${existingDate.eliminations.length}, TimerStates: ${existingDate.timerStates.length}`)

      // Validar que se puede eliminar
      if (existingDate.status === 'pending') {
        return NextResponse.json(
          { error: 'No se puede eliminar una fecha no configurada' },
          { status: 400 }
        )
      }

      // Usar transacción para eliminar todo de forma segura
      const result = await prisma.$transaction(async (tx) => {
        let deletedRecords = {
          timerActions: 0,
          timerStates: 0,
          eliminations: 0,
          tournamentRankings: 0
        }

        // 1. Eliminar timer actions (dependencias de timer states)
        for (const timerState of existingDate.timerStates) {
          const deletedActions = await tx.timerAction.deleteMany({
            where: { timerStateId: timerState.id }
          })
          deletedRecords.timerActions += deletedActions.count
        }

        // 2. Eliminar timer states
        const deletedTimerStates = await tx.timerState.deleteMany({
          where: { gameDateId: gameDateId }
        })
        deletedRecords.timerStates = deletedTimerStates.count

        // 3. Eliminar eliminations
        const deletedEliminations = await tx.elimination.deleteMany({
          where: { gameDateId: gameDateId }
        })
        deletedRecords.eliminations = deletedEliminations.count

        // 4. Eliminar tournament rankings relacionados
        const deletedRankings = await tx.tournamentRanking.deleteMany({
          where: { 
            tournamentId: existingDate.tournament.id,
            // Solo eliminar rankings que podrían estar relacionados con esta fecha
            // (esto es un enfoque conservador)
          }
        })
        deletedRecords.tournamentRankings = deletedRankings.count

        // 5. Resetear la GameDate a estado pendiente
        const resetGameDate = await tx.gameDate.update({
          where: { id: gameDateId },
          data: {
            status: 'pending',
            startTime: null,
            playerIds: [],
            playersMin: 9,
            playersMax: 24
          }
        })

        return { resetGameDate, deletedRecords }
      })

      console.log(`[DELETE GAME DATE] Deletion completed successfully:`)
      console.log(`[DELETE GAME DATE] - Timer Actions deleted: ${result.deletedRecords.timerActions}`)
      console.log(`[DELETE GAME DATE] - Timer States deleted: ${result.deletedRecords.timerStates}`)
      console.log(`[DELETE GAME DATE] - Eliminations deleted: ${result.deletedRecords.eliminations}`)
      console.log(`[DELETE GAME DATE] - Tournament Rankings deleted: ${result.deletedRecords.tournamentRankings}`)
      console.log(`[DELETE GAME DATE] - GameDate reset to: ${result.resetGameDate.status}`)

      return NextResponse.json({
        success: true,
        message: `Fecha ${existingDate.dateNumber} del ${existingDate.tournament.name} eliminada y reseteada correctamente`,
        deletedRecords: result.deletedRecords,
        gameDate: {
          id: result.resetGameDate.id,
          dateNumber: result.resetGameDate.dateNumber,
          status: result.resetGameDate.status,
          tournament: existingDate.tournament
        }
      })

    } catch (error) {
      console.error('[DELETE GAME DATE] Error:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor al eliminar fecha' },
        { status: 500 }
      )
    }
  })
}