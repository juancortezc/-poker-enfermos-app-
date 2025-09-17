'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Medal, Target, TrendingUp, Users, Calendar, Crown } from 'lucide-react'

interface HistoricalStats {
  summary: {
    totalTournaments: number
    totalPlayers: number
    tournamentWinners: any[]
    tournamentsByNumber: Record<number, any[]>
  }
  playerStats: Array<{
    playerId: string
    playerName: string
    wins: number
    secondPlaces: number
    thirdPlaces: number
    seventhPlaces: number
    secondToLastPlaces: number
    totalTournaments: number
    winPercentage: number
    topThreePercentage: number
    averagePosition: number
  }>
}

interface HistoricalStatsCardProps {
  className?: string
}

export default function HistoricalStatsCard({ className = '' }: HistoricalStatsCardProps) {
  const [stats, setStats] = useState<HistoricalStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadHistoricalStats()
  }, [])

  const loadHistoricalStats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/stats/historical', {
        headers: {
          'Authorization': `Bearer PIN:${localStorage.getItem('poker-pin')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al cargar estadísticas')
      }
    } catch (err) {
      setError('Error de conexión')
      console.error('Error loading historical stats:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card className={`bg-poker-card border-white/10 ${className}`}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poker-red"></div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`bg-poker-card border-white/10 ${className}`}>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-red-400">Error: {error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!stats || stats.playerStats.length === 0) {
    return (
      <Card className={`bg-poker-card border-white/10 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-poker-gold" />
            Estadísticas Históricas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-poker-muted mx-auto mb-4" />
            <p className="text-poker-muted">No hay datos históricos disponibles</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get top performers
  const topChampion = stats.playerStats[0] // Already sorted by wins
  const mostConsistent = stats.playerStats
    .filter(p => p.totalTournaments >= 3)
    .sort((a, b) => b.topThreePercentage - a.topThreePercentage)[0]
  const mostActive = stats.playerStats
    .sort((a, b) => b.totalTournaments - a.totalTournaments)[0]

  return (
    <Card className={`bg-poker-card border-white/10 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-poker-gold" />
          Estadísticas Históricas
          <span className="text-sm text-poker-muted font-normal">
            (Torneos 1-{Math.max(...Object.keys(stats.summary.tournamentsByNumber).map(Number))})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center bg-poker-dark/30 p-3 rounded-lg">
            <div className="text-2xl font-bold text-white">{stats.summary.totalTournaments}</div>
            <div className="text-poker-muted text-sm">Torneos</div>
          </div>
          <div className="text-center bg-poker-dark/30 p-3 rounded-lg">
            <div className="text-2xl font-bold text-white">{stats.summary.totalPlayers}</div>
            <div className="text-poker-muted text-sm">Jugadores</div>
          </div>
          <div className="text-center bg-poker-dark/30 p-3 rounded-lg">
            <div className="text-2xl font-bold text-poker-gold">{stats.summary.tournamentWinners.length}</div>
            <div className="text-poker-muted text-sm">Campeones</div>
          </div>
          <div className="text-center bg-poker-dark/30 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">
              {stats.playerStats.reduce((sum, p) => sum + p.topThreePercentage, 0) / stats.playerStats.length || 0}%
            </div>
            <div className="text-poker-muted text-sm">Avg Top 3</div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="space-y-4">
          <h3 className="text-white font-semibold">Destacados Históricos</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Most Championships */}
            {topChampion && (
              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 p-4 rounded-lg border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-400 font-semibold">Más Campeonatos</span>
                </div>
                <div className="text-white font-bold">{topChampion.playerName}</div>
                <div className="text-yellow-300 text-sm">
                  {topChampion.wins} campeonatos ({topChampion.winPercentage.toFixed(1)}%)
                </div>
              </div>
            )}

            {/* Most Consistent */}
            {mostConsistent && (
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-4 rounded-lg border border-blue-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  <span className="text-blue-400 font-semibold">Más Consistente</span>
                </div>
                <div className="text-white font-bold">{mostConsistent.playerName}</div>
                <div className="text-blue-300 text-sm">
                  {mostConsistent.topThreePercentage.toFixed(1)}% Top 3
                </div>
              </div>
            )}

            {/* Most Active */}
            {mostActive && (
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 p-4 rounded-lg border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-semibold">Más Participativo</span>
                </div>
                <div className="text-white font-bold">{mostActive.playerName}</div>
                <div className="text-green-300 text-sm">
                  {mostActive.totalTournaments} torneos
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top 5 Championships */}
        <div className="space-y-3">
          <h3 className="text-white font-semibold">Top Campeones Históricos</h3>
          <div className="space-y-2">
            {stats.playerStats.slice(0, 5).map((player, index) => (
              <div key={player.playerId} className="flex items-center justify-between bg-poker-dark/30 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-400 text-black' :
                    index === 2 ? 'bg-orange-600 text-white' :
                    'bg-poker-dark text-white'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-white font-medium">{player.playerName}</div>
                    <div className="text-poker-muted text-sm">
                      {player.totalTournaments} torneos • Promedio: {player.averagePosition.toFixed(1)}º
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-poker-gold font-bold">{player.wins} 🏆</div>
                  <div className="text-poker-muted text-sm">
                    {player.secondPlaces}🥈 {player.thirdPlaces}🥉
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-white/10 flex gap-2">
          <button
            onClick={() => window.location.href = '/admin/stats'}
            className="flex-1 bg-poker-red hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            Ver Todas las Estadísticas
          </button>
        </div>
      </CardContent>
    </Card>
  )
}