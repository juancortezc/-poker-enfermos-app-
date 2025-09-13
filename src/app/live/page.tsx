'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { useGameDateLiveStatus } from '@/hooks/useGameDateLiveStatus'
import { LiveTimerDisplay } from '@/components/live/LiveTimerDisplay'
import { LiveStats } from '@/components/live/LiveStats'
import { ActivePlayersTable } from '@/components/live/ActivePlayersTable'
import { RecentEliminationsTable } from '@/components/live/RecentEliminationsTable'

export default function LivePage() {
  const router = useRouter()
  const { user, hasPermission, isComision } = useAuth()
  const [isLoading, setIsLoading] = useState(true)

  // Obtener fecha activa
  const { gameDate: activeGameDate, isLoading: isLoadingGameDate } = useActiveGameDate()

  // Obtener datos en tiempo real
  const { 
    liveStatus, 
    isLoading: isLoadingLiveStatus, 
    isError,
    errorMessage,
    refresh,
    isGameActive,
    hasActivePlayers
  } = useGameDateLiveStatus(activeGameDate?.id || null)

  useEffect(() => {
    // Redirect a home si no está autenticado
    if (!user) {
      router.push('/')
      return
    }

    // Verificar permisos para acceder a LIVE
    if (!hasPermission('canAccessLive')) {
      router.push('/')
      return
    }

    // Redireccionar usuarios Comision a registro si hay fecha activa
    if (isComision && activeGameDate) {
      router.push('/registro')
      return
    }

    setIsLoading(false)
  }, [user, hasPermission, isComision, activeGameDate, router])

  // Loading inicial
  if (isLoading || isLoadingGameDate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-poker-dark">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full animate-pulse">
            <span className="text-2xl">⏳</span>
          </div>
          <p className="mt-4 text-poker-muted">Cargando...</p>
        </div>
      </div>
    )
  }

  // No hay fecha activa
  if (!activeGameDate) {
    return (
      <div className="min-h-screen pb-24 bg-poker-dark">
        {/* Header */}
        <div className="bg-poker-dark-gradient pt-safe-area-top">
          <div className="container p-4">
            <h1 className="text-2xl font-bold text-white text-center">
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                LIVE
              </span>
            </h1>
          </div>
        </div>

        {/* No active game message */}
        <div className="container p-4">
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 rounded-full mb-6">
              <span className="text-4xl">⏸️</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No hay juego activo
            </h2>
            <p className="text-poker-muted max-w-md mx-auto">
              El modo LIVE se activará automáticamente cuando inicie una fecha de juego.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Error cargando datos
  if (isError) {
    return (
      <div className="min-h-screen pb-24 bg-poker-dark">
        {/* Header */}
        <div className="bg-poker-dark-gradient pt-safe-area-top">
          <div className="container p-4">
            <h1 className="text-2xl font-bold text-white text-center">
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                LIVE
              </span>
            </h1>
          </div>
        </div>

        {/* Error message */}
        <div className="container p-4">
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-red-500/10 rounded-full mb-6">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Error cargando datos
            </h2>
            <p className="text-poker-muted max-w-md mx-auto mb-4">
              {errorMessage}
            </p>
            <button 
              onClick={refresh}
              className="bg-poker-red hover:bg-poker-red/80 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 bg-poker-dark">
      {/* Header */}
      <div className="bg-poker-dark-gradient pt-safe-area-top">
        <div className="container p-4">
          <h1 className="text-2xl font-bold text-white text-center">
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 bg-poker-red rounded-full animate-pulse"></span>
              LIVE
            </span>
          </h1>
          {liveStatus && (
            <div className="text-center mt-2">
              <div className="text-sm text-poker-muted">
                {liveStatus.tournament.name} - Fecha {liveStatus.gameDate.dateNumber}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container p-4 space-y-6">
        {/* Timer Display */}
        <LiveTimerDisplay 
          currentBlind={liveStatus?.currentBlind || null}
          isActive={isGameActive}
        />

        {/* Stats Cards */}
        {liveStatus && (
          <LiveStats 
            playersRemaining={liveStatus.liveStats.playersRemaining}
            totalPlayers={liveStatus.liveStats.totalPlayers}
            winnerPoints={liveStatus.liveStats.winnerPoints}
            eliminationsCount={liveStatus.liveStats.eliminationsCount}
          />
        )}

        {/* Active Players and Recent Eliminations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivePlayersTable 
            activePlayers={liveStatus?.activePlayers || []}
            isLoading={isLoadingLiveStatus}
          />
          
          <RecentEliminationsTable 
            eliminations={liveStatus?.recentEliminations || []}
            isLoading={isLoadingLiveStatus}
          />
        </div>

        {/* Game Status */}
        {liveStatus && !hasActivePlayers && (
          <div className="bg-poker-card border border-yellow-500/50 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold text-yellow-400 mb-2">
              ¡Juego Finalizado!
            </h3>
            <p className="text-poker-muted">
              El ganador se llevó {liveStatus.liveStats.winnerPoints} puntos
            </p>
          </div>
        )}

        {/* Refresh indicator */}
        <div className="text-center text-xs text-poker-muted">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Actualización automática cada 5 segundos
          </span>
        </div>
      </div>
    </div>
  )
}