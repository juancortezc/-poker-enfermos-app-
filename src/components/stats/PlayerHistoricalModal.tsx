'use client'

import { useState, useEffect } from 'react'
import { X, Trophy, Medal, Target, TrendingUp, Calendar, Award, Crown } from 'lucide-react'

interface PlayerHistoricalStats {
  playerInfo: {
    id: string
    firstName: string
    lastName: string
    role: string
    isActive: boolean
    joinYear?: number
  }
  totalTournaments: number
  wins: number
  secondPlaces: number
  thirdPlaces: number
  seventhPlaces: number
  secondToLastPlaces: number
  topThreeFinishes: number
  averagePosition: number
  bestFinish: number | null
  worstFinish: number | null
  winPercentage: number
  topThreePercentage: number
  tournamentHistory: Array<{
    tournamentNumber: number
    finalPosition: number
    points?: number
    isWinner: boolean
    isSecondPlace: boolean
    isThirdPlace: boolean
    is7thPlace: boolean
    is2ndToLast: boolean
    notes?: string
    positionLabel: string
    achievement: string
  }>
}

interface PlayerHistoricalModalProps {
  isOpen: boolean
  onClose: () => void
  playerId: string | null
}

export default function PlayerHistoricalModal({ isOpen, onClose, playerId }: PlayerHistoricalModalProps) {
  const [stats, setStats] = useState<PlayerHistoricalStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && playerId) {
      loadPlayerStats()
    }
  }, [isOpen, playerId])

  const loadPlayerStats = async () => {
    if (!playerId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/stats/historical/player/${playerId}`, {
        headers: {
          'Authorization': `Bearer PIN:${localStorage.getItem('poker-pin')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.data.stats)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al cargar estadísticas')
      }
    } catch (err) {
      setError('Error de conexión')
      console.error('Error loading player historical stats:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getAchievementIcon = (achievement: string) => {
    switch (achievement) {
      case 'championship': return '🏆'
      case 'runner-up': return '🥈'
      case 'third-place': return '🥉'
      case 'seventh-place': return '🎯'
      case 'second-to-last': return '🎯'
      default: return '📍'
    }
  }

  const getAchievementColor = (achievement: string) => {
    switch (achievement) {
      case 'championship': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'runner-up': return 'text-gray-300 bg-gray-500/20 border-gray-500/30'
      case 'third-place': return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
      case 'seventh-place': return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      case 'second-to-last': return 'text-purple-400 bg-purple-500/20 border-purple-500/30'
      default: return 'text-poker-muted bg-poker-dark/30 border-white/10'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-poker-card border border-white/10 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">
              {stats ? `${stats.playerInfo.firstName} ${stats.playerInfo.lastName}` : 'Cargando...'}
            </h2>
            <p className="text-poker-muted">Estadísticas Históricas de Torneos</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-poker-muted" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poker-red"></div>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-400">Error: {error}</p>
            </div>
          )}

          {stats && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center bg-poker-dark/30 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-poker-gold">{stats.wins}</div>
                  <div className="text-poker-muted text-sm">Campeonatos</div>
                </div>
                <div className="text-center bg-poker-dark/30 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">{stats.topThreeFinishes}</div>
                  <div className="text-poker-muted text-sm">Top 3</div>
                </div>
                <div className="text-center bg-poker-dark/30 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-white">{stats.totalTournaments}</div>
                  <div className="text-poker-muted text-sm">Participaciones</div>
                </div>
                <div className="text-center bg-poker-dark/30 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">{stats.averagePosition.toFixed(1)}</div>
                  <div className="text-poker-muted text-sm">Posición Promedio</div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 p-4 rounded-lg border border-yellow-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400 font-semibold">Efectividad</span>
                  </div>
                  <div className="text-white text-2xl font-bold">{stats.winPercentage.toFixed(1)}%</div>
                  <div className="text-yellow-300 text-sm">Ratio de victorias</div>
                </div>

                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-4 rounded-lg border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    <span className="text-blue-400 font-semibold">Consistencia</span>
                  </div>
                  <div className="text-white text-2xl font-bold">{stats.topThreePercentage.toFixed(1)}%</div>
                  <div className="text-blue-300 text-sm">Top 3 finishes</div>
                </div>

                <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 p-4 rounded-lg border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-semibold">Rango</span>
                  </div>
                  <div className="text-white text-lg font-bold">
                    {stats.bestFinish}º - {stats.worstFinish}º
                  </div>
                  <div className="text-green-300 text-sm">Mejor - Peor</div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="text-center bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 p-3 rounded-lg border border-yellow-500/30">
                  <div className="text-xl font-bold text-yellow-400">{stats.wins}</div>
                  <div className="text-yellow-300 text-sm">🏆 Campeón</div>
                </div>
                <div className="text-center bg-gradient-to-br from-gray-400/20 to-gray-500/10 p-3 rounded-lg border border-gray-400/30">
                  <div className="text-xl font-bold text-gray-300">{stats.secondPlaces}</div>
                  <div className="text-gray-300 text-sm">🥈 Segundo</div>
                </div>
                <div className="text-center bg-gradient-to-br from-orange-500/20 to-orange-600/10 p-3 rounded-lg border border-orange-500/30">
                  <div className="text-xl font-bold text-orange-400">{stats.thirdPlaces}</div>
                  <div className="text-orange-300 text-sm">🥉 Tercero</div>
                </div>
                <div className="text-center bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-3 rounded-lg border border-blue-500/30">
                  <div className="text-xl font-bold text-blue-400">{stats.seventhPlaces}</div>
                  <div className="text-blue-300 text-sm">🎯 7mo</div>
                </div>
                <div className="text-center bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-3 rounded-lg border border-purple-500/30">
                  <div className="text-xl font-bold text-purple-400">{stats.secondToLastPlaces}</div>
                  <div className="text-purple-300 text-sm">🎯 Penúltimo</div>
                </div>
              </div>

              {/* Tournament History */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Historial de Torneos
                </h3>
                
                <div className="max-h-64 overflow-y-auto">
                  <div className="grid gap-2">
                    {stats.tournamentHistory.map((tournament, index) => (
                      <div
                        key={tournament.tournamentNumber}
                        className={`p-3 rounded-lg border ${getAchievementColor(tournament.achievement)} flex items-center justify-between`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getAchievementIcon(tournament.achievement)}</span>
                          <div>
                            <div className="font-bold text-white">
                              Torneo {tournament.tournamentNumber}
                            </div>
                            <div className="text-sm text-poker-text">
                              {tournament.positionLabel}
                              {tournament.points && ` • ${tournament.points} pts`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">
                            {tournament.finalPosition}º
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {stats.tournamentHistory.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-poker-muted mx-auto mb-4" />
                    <p className="text-poker-muted">No hay historial de torneos disponible</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}