import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withComisionAuth } from '@/lib/api-auth'

// GET - Obtener detalles de una fecha específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withComisionAuth(request, async (req, user) => {
    try {
      const gameDateId = parseInt(params.id)

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
  { params }: { params: { id: string } }
) {
  return withComisionAuth(request, async (req, user) => {
    try {
      const gameDateId = parseInt(params.id)
      const body = await req.json()
      const { action, playerIds, guestIds } = body

      // Handle start action
      if (action === 'start') {
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
          return NextResponse.json(
            { error: `La fecha debe estar configurada para iniciar (estado actual: ${existingDate.status})` },
            { status: 400 }
          )
        }

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
              performedBy: user.id,
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

        return NextResponse.json({
          success: true,
          gameDate: result.updatedGameDate,
          timerState: result.timerState
        })
      }

      // Handle update action
      if (action === 'update' && playerIds) {
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

        // Calcular participantes totales
        const totalParticipants = playerIds.length + (guestIds?.length || 0)

        // Actualizar la fecha de juego
        const updatedGameDate = await prisma.gameDate.update({
          where: { id: gameDateId },
          data: {
            playerIds: playerIds,
            playersMin: Math.min(9, totalParticipants),
            playersMax: Math.max(24, totalParticipants)
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

        return NextResponse.json({
          success: true,
          gameDate: {
            ...updatedGameDate,
            totalParticipants,
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