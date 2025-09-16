import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

// GET - Unified endpoint for all GameDate status information
export async function GET(request: NextRequest) {
  return withAuth(request, async (_req, user) => {
    try {
      // Get active tournament
      const activeTournament = await prisma.tournament.findFirst({
        where: { status: 'ACTIVO' },
        include: {
          gameDates: {
            orderBy: { dateNumber: 'asc' }
          }
        }
      })

      if (!activeTournament) {
        return NextResponse.json({
          success: true,
          tournament: null,
          activeGameDate: null,
          timerData: null,
          availableDates: [],
          visibility: {
            showInRegistro: false,
            showInTimer: false,
            showInConfig: false,
            showInAdmin: false
          }
        })
      }

      // Find the current active/created date
      const activeGameDate = activeTournament.gameDates.find(gd => 
        gd.status === 'in_progress' || gd.status === 'CREATED'
      )

      // Get timer data if there's an active game date
      let timerData = null
      if (activeGameDate && activeGameDate.status === 'in_progress') {
        const timerState = await prisma.timerState.findFirst({
          where: { gameDateId: activeGameDate.id },
          include: {
            timerActions: {
              orderBy: { performedAt: 'desc' },
              take: 5
            }
          }
        })

        if (timerState) {
          // Get blind levels from tournament
          const tournament = await prisma.tournament.findUnique({
            where: { id: activeTournament.id },
            include: {
              blindLevels: {
                orderBy: { level: 'asc' }
              }
            }
          })

          const blindLevels = tournament?.blindLevels || []
          const currentBlind = blindLevels.find(bl => bl.level === timerState.currentLevel)
          const nextBlind = blindLevels.find(bl => bl.level === timerState.currentLevel + 1)

          // Calculate real-time remaining if timer is active
          let actualTimeRemaining = timerState.timeRemaining
          
          if (timerState.status === 'active' && timerState.levelStartTime) {
            const now = new Date()
            const levelStartTime = new Date(timerState.levelStartTime)
            const elapsedSeconds = Math.floor((now.getTime() - levelStartTime.getTime()) / 1000)
            const totalDuration = (currentBlind?.duration || 0) * 60
            
            actualTimeRemaining = Math.max(0, totalDuration - elapsedSeconds)
          }

          timerData = {
            ...timerState,
            timeRemaining: actualTimeRemaining,
            currentBlind,
            nextBlind,
            isActive: timerState.status === 'active',
            canControl: user.role === 'Comision'
          }
        }
      }

      // Get available dates for configuration
      const availableDates = activeTournament.gameDates
        .filter(gd => gd.status === 'pending' || gd.status === 'CREATED')
        .map(gd => ({
          id: gd.id,
          dateNumber: gd.dateNumber,
          scheduledDate: gd.scheduledDate.toISOString().split('T')[0],
          status: gd.status
        }))

      // Determine visibility flags for each page
      const visibility = {
        // Registration page: show when date is in_progress
        showInRegistro: activeGameDate?.status === 'in_progress',
        
        // Timer page: show when date is in_progress (has timer state)
        showInTimer: activeGameDate?.status === 'in_progress' && timerData !== null,
        
        // Config page: show when there are available dates to configure
        showInConfig: availableDates.length > 0,
        
        // Admin page: show when user is Comision
        showInAdmin: user.role === 'Comision'
      }

      // Enhanced active game date info
      let enhancedActiveGameDate = null
      if (activeGameDate) {
        enhancedActiveGameDate = {
          id: activeGameDate.id,
          dateNumber: activeGameDate.dateNumber,
          status: activeGameDate.status,
          scheduledDate: activeGameDate.scheduledDate,
          startTime: activeGameDate.startTime,
          playerIds: activeGameDate.playerIds,
          playersCount: activeGameDate.playerIds.length,
          tournament: {
            id: activeTournament.id,
            name: activeTournament.name,
            number: activeTournament.number
          },
          // Status flags for easy conditional rendering
          isActive: activeGameDate.status === 'in_progress',
          isConfigured: activeGameDate.status === 'CREATED',
          canStart: activeGameDate.status === 'CREATED',
          canEdit: activeGameDate.status === 'CREATED' && user.role === 'Comision'
        }
      }

      return NextResponse.json({
        success: true,
        tournament: {
          id: activeTournament.id,
          name: activeTournament.name,
          number: activeTournament.number,
          status: activeTournament.status
        },
        activeGameDate: enhancedActiveGameDate,
        timerData,
        availableDates,
        visibility,
        userRole: user.role,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('[GAME DATE STATUS API] Error:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Error interno del servidor' 
        },
        { status: 500 }
      )
    }
  })
}