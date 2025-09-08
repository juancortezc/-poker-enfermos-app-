'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import LoadingState from '@/components/ui/LoadingState'
import TournamentCompletionModal from './TournamentCompletionModal'
import { ArrowLeft, Users, Calendar, Trophy, Plus } from 'lucide-react'
import { canCRUD } from '@/lib/auth'

interface Tournament {
  id: number
  name: string
  number: number
  status: string
  createdAt: string
  gameDates: Array<{
    id: number
    dateNumber: number
    scheduledDate: string
    status: string
  }>
  _count: {
    tournamentParticipants: number
    gameDates: number
  }
}

export default function SimpleTournamentPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  useEffect(() => {
    fetchActiveTournament()
  }, [])

  const fetchActiveTournament = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tournaments/active', {
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTournament(data.tournament)
      } else {
        setTournament(null)
      }
    } catch (err) {
      setError('Error al cargar torneo')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    router.push('/tournaments/new/configure')
  }

  const handleViewDetails = () => {
    router.push('/admin')
  }

  const handleCreateGameDate = () => {
    if (tournament) {
      // Go directly to a simpler game date creation flow
      router.push(`/tournaments/${tournament.id}/new-date`)
    }
  }

  const completedDates = tournament?.gameDates.filter(d => d.status === 'completed').length || 0
  const nextDateNumber = completedDates + 1

  if (loading) {
    return <LoadingState message="Cargando torneo..." />
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-poker-muted hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Gestión de Torneos</h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {tournament ? (
        <div className="space-y-6">
          {/* Tournament Card */}
          <div className="bg-poker-card border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-poker-red rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{tournament.name}</h2>
                  <p className="text-poker-muted">
                    {tournament._count.tournamentParticipants} participantes • {completedDates} de {tournament._count.gameDates} fechas completadas
                  </p>
                </div>
              </div>
              <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                <span className="text-green-400 text-sm font-medium">ACTIVO</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-poker-dark/50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-poker-cyan" />
                  <span className="text-poker-muted text-sm">Participantes</span>
                </div>
                <p className="text-white font-semibold text-lg">{tournament._count.tournamentParticipants}</p>
              </div>
              <div className="bg-poker-dark/50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-orange-400" />
                  <span className="text-poker-muted text-sm">Progreso</span>
                </div>
                <p className="text-white font-semibold text-lg">{completedDates}/{tournament._count.gameDates}</p>
              </div>
              <div className="bg-poker-dark/50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-poker-red" />
                  <span className="text-poker-muted text-sm">Próxima Fecha</span>
                </div>
                <p className="text-white font-semibold text-lg">
                  {nextDateNumber <= tournament._count.gameDates ? `Fecha ${nextDateNumber}` : 'Completo'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleViewDetails}
                variant="secondary"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Ver Detalles
              </Button>
              {nextDateNumber <= tournament._count.gameDates && canCRUD(user?.role) && (
                <Button
                  onClick={handleCreateGameDate}
                  className="bg-poker-red hover:bg-poker-red/80 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Fecha
                </Button>
              )}
              {canCRUD(user?.role) && (
                <Button
                  onClick={() => setShowCompletionModal(true)}
                  variant="outline"
                  className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                >
                  Completar Torneo
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* No Tournament */
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-poker-dark/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-12 h-12 text-poker-muted" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No hay torneo activo</h2>
          <p className="text-poker-muted mb-6">Crea un nuevo torneo para comenzar</p>
          {canCRUD(user?.role) && (
            <Button
              onClick={handleCreateNew}
              className="bg-poker-red hover:bg-poker-red/80 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Nuevo Torneo
            </Button>
          )}
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && tournament && (
        <TournamentCompletionModal
          tournament={tournament}
          onClose={() => setShowCompletionModal(false)}
          onComplete={() => {
            setShowCompletionModal(false)
            fetchActiveTournament()
          }}
        />
      )}
    </div>
  )
}