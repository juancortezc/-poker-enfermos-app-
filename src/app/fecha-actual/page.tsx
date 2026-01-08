'use client'

import { useAuth } from '@/contexts/AuthContext'
import useSWR from 'swr'
import { Skull, Trophy, Users } from 'lucide-react'
import CPAppShell from '@/components/clean-poker/CPAppShell'
import CPHeader from '@/components/clean-poker/CPHeader'
import CPBottomNav from '@/components/clean-poker/CPBottomNav'

interface Player {
  id: string
  firstName: string
  lastName: string
}

interface Elimination {
  id: string
  position: number
  points: number
  eliminatedPlayerId: string
  eliminatorPlayerId?: string | null
  eliminatedPlayer: Player
  eliminatorPlayer?: Player | null
}

interface ActiveGameDate {
  id: number
  dateNumber: number
  status: string
  playerIds: string[]
  playersCount: number
  tournament: {
    id: number
    name: string
    number: number
  }
}

export default function FechaActualPage() {
  const { user } = useAuth()

  // Fetch active game date
  const { data: activeGameDate, isLoading: loadingDate } = useSWR<ActiveGameDate | null>(
    '/api/game-dates/active',
    { refreshInterval: 30000 }
  )

  // Fetch eliminations
  const { data: eliminations, isLoading: loadingEliminations } = useSWR<Elimination[]>(
    activeGameDate?.id ? `/api/eliminations/game-date/${activeGameDate.id}` : null,
    { refreshInterval: 15000 }
  )

  // Fetch players
  const { data: players } = useSWR<Player[]>(
    activeGameDate?.id ? `/api/game-dates/${activeGameDate.id}/players` : null
  )

  const isLoading = loadingDate || loadingEliminations

  const userInitials = user?.firstName?.slice(0, 2).toUpperCase() || 'PE'
  const isComision = user?.role === 'Comision'
  const tournamentNumber = activeGameDate?.tournament?.number ?? 29

  // Calculate stats
  const totalPlayers = activeGameDate?.playersCount || 0
  const eliminatedCount = eliminations?.length || 0
  const activePlayers = totalPlayers - eliminatedCount

  // Sort eliminations by position ascending (winner first)
  const sortedEliminations = [...(eliminations || [])].sort((a, b) => a.position - b.position)

  // Get active players (not eliminated)
  const eliminatedIds = new Set(eliminations?.map(e => e.eliminatedPlayerId) || [])
  const activePlayersList = players?.filter(p => !eliminatedIds.has(p.id)) || []

  if (isLoading) {
    return (
      <CPAppShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-3"
              style={{
                borderColor: 'var(--cp-surface-border)',
                borderTopColor: 'var(--cp-primary)'
              }}
            />
            <p style={{ color: 'var(--cp-on-surface-variant)' }}>Cargando...</p>
          </div>
        </div>
      </CPAppShell>
    )
  }

  if (!activeGameDate || activeGameDate.status !== 'in_progress') {
    return (
      <CPAppShell>
        <CPHeader
          userInitials={userInitials}
          userPhotoUrl={user?.photoUrl}
          tournamentNumber={tournamentNumber}
          isComision={isComision}
          hasActiveGameDate={false}
        />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div
            className="p-6 text-center max-w-sm"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              borderRadius: '4px',
            }}
          >
            <p
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--cp-on-surface)' }}
            >
              No hay fecha en progreso
            </p>
            <p style={{ color: 'var(--cp-on-surface-muted)' }}>
              Vuelve cuando haya una fecha activa.
            </p>
          </div>
        </div>
        <CPBottomNav />
      </CPAppShell>
    )
  }

  return (
    <CPAppShell>
      <div className="min-h-screen pb-24">
        <CPHeader
          userInitials={userInitials}
          userPhotoUrl={user?.photoUrl}
          tournamentNumber={tournamentNumber}
          isComision={isComision}
          hasActiveGameDate={true}
        />

        <div className="max-w-lg mx-auto px-4">
          {/* Title */}
          <div className="flex items-center justify-center gap-2 py-3">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: 'var(--cp-live)',
                boxShadow: '0 0 8px var(--cp-live-glow)'
              }}
            />
            <p
              className="text-center font-semibold"
              style={{
                color: 'var(--cp-live)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Fecha #{activeGameDate.dateNumber} en Vivo
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div
              className="text-center p-3"
              style={{
                background: 'var(--cp-surface)',
                border: '1px solid var(--cp-surface-border)',
                borderRadius: '4px',
              }}
            >
              <p
                className="text-2xl font-bold"
                style={{ color: 'var(--cp-on-surface)' }}
              >
                {totalPlayers}
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--cp-on-surface-muted)' }}
              >
                Jugadores
              </p>
            </div>
            <div
              className="text-center p-3"
              style={{
                background: 'var(--cp-surface)',
                border: '1px solid var(--cp-surface-border)',
                borderRadius: '4px',
              }}
            >
              <p
                className="text-2xl font-bold"
                style={{ color: 'var(--cp-live)' }}
              >
                {activePlayers}
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--cp-on-surface-muted)' }}
              >
                Activos
              </p>
            </div>
            <div
              className="text-center p-3"
              style={{
                background: 'var(--cp-surface)',
                border: '1px solid var(--cp-surface-border)',
                borderRadius: '4px',
              }}
            >
              <p
                className="text-2xl font-bold"
                style={{ color: 'var(--cp-on-surface-variant)' }}
              >
                {eliminatedCount}
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--cp-on-surface-muted)' }}
              >
                Eliminados
              </p>
            </div>
          </div>

          {/* Active Players */}
          {activePlayersList.length > 0 && (
            <div
              className="mb-4 p-4"
              style={{
                background: 'var(--cp-surface)',
                border: '1px solid var(--cp-surface-border)',
                borderRadius: '4px',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} style={{ color: 'var(--cp-live)' }} />
                <h3 className="font-semibold" style={{ color: 'var(--cp-on-surface)' }}>
                  En Juego ({activePlayersList.length})
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {activePlayersList.map((player) => (
                  <span
                    key={player.id}
                    className="px-2 py-1 text-sm"
                    style={{
                      background: 'rgba(76, 175, 80, 0.15)',
                      border: '1px solid rgba(76, 175, 80, 0.3)',
                      borderRadius: '4px',
                      color: '#4CAF50',
                    }}
                  >
                    {player.firstName} {player.lastName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Eliminations List */}
          <div
            className="p-4"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              borderRadius: '4px',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Skull size={16} style={{ color: 'var(--cp-on-surface-muted)' }} />
              <h3 className="font-semibold" style={{ color: 'var(--cp-on-surface)' }}>
                Eliminaciones
              </h3>
            </div>

            {sortedEliminations.length === 0 ? (
              <p
                className="text-center py-4 italic"
                style={{ color: 'var(--cp-on-surface-muted)' }}
              >
                Sin eliminaciones aún
              </p>
            ) : (
              <div className="space-y-2">
                {sortedEliminations.map((elim) => (
                  <div
                    key={elim.id}
                    className="flex items-center justify-between py-2 px-3"
                    style={{
                      background: elim.position === 1
                        ? 'rgba(255, 193, 7, 0.1)'
                        : 'var(--cp-background)',
                      border: elim.position === 1
                        ? '1px solid rgba(255, 193, 7, 0.3)'
                        : '1px solid var(--cp-surface-border)',
                      borderRadius: '4px',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Position */}
                      <div
                        className="w-8 h-8 flex items-center justify-center font-bold"
                        style={{
                          background: elim.position === 1
                            ? 'rgba(255, 193, 7, 0.2)'
                            : 'var(--cp-surface)',
                          borderRadius: '4px',
                          color: elim.position === 1
                            ? '#FFC107'
                            : 'var(--cp-on-surface)',
                        }}
                      >
                        {elim.position === 1 ? (
                          <Trophy size={16} />
                        ) : (
                          elim.position
                        )}
                      </div>

                      {/* Player Info */}
                      <div>
                        <p
                          className="font-semibold"
                          style={{
                            color: elim.position === 1
                              ? '#FFC107'
                              : 'var(--cp-on-surface)',
                          }}
                        >
                          {elim.eliminatedPlayer.firstName} {elim.eliminatedPlayer.lastName}
                          {elim.position === 1 && ' - GANADOR'}
                        </p>
                        {elim.eliminatorPlayer && elim.position !== 1 && (
                          <p
                            className="text-xs"
                            style={{ color: 'var(--cp-on-surface-muted)' }}
                          >
                            vs {elim.eliminatorPlayer.firstName} {elim.eliminatorPlayer.lastName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right">
                      <p
                        className="font-bold"
                        style={{
                          color: elim.position === 1
                            ? '#FFC107'
                            : 'var(--cp-positive)',
                        }}
                      >
                        +{elim.points}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: 'var(--cp-on-surface-muted)' }}
                      >
                        pts
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <CPBottomNav />
      </div>
    </CPAppShell>
  )
}
