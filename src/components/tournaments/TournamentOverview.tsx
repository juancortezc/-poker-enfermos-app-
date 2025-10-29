'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import LoadingState from '@/components/ui/LoadingState'
import TournamentCompletionModal from './TournamentCompletionModal'
import TournamentCancellationModal from './TournamentCancellationModal'
import { ArrowLeft, Users, Play, X, Loader2 } from 'lucide-react'
import { buildAuthHeaders, getStoredAuthToken } from '@/lib/client-auth'

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

interface TournamentData {
  tournament: Tournament | null
  stats?: {
    completedDates?: number
    totalDates?: number
    nextDate?: { dateNumber: number; scheduledDate: string } | null
    startDate?: string
    endDate?: string
    isCompleted?: boolean
    totalParticipants?: number
  }
}

export default function TournamentOverview() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTournament, setActiveTournament] = useState<TournamentData>({ tournament: null })
  const [nextTournament, setNextTournament] = useState<TournamentData>({ tournament: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activating, setActivating] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [showCancellationModal, setShowCancellationModal] = useState(false)
  const [cancellationType, setCancellationType] = useState<'active' | 'next'>('active')

  const canEdit = user?.role === 'Comision'

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    try {
      setLoading(true)
      if (!getStoredAuthToken()) {
        setLoading(false)
        return
      }
      const headers = buildAuthHeaders()

      // Fetch active tournament
      const activeResponse = await fetch('/api/tournaments/active', {
        headers
      })

      if (activeResponse.ok) {
        const activeData = await activeResponse.json()
        setActiveTournament(activeData)
      }

      // Next tournament is always null with current architecture
      setNextTournament(null)
    } catch (error) {
      console.error('Error fetching tournaments:', error)
      setError('Error al cargar torneos')
    } finally {
      setLoading(false)
    }
  }

  const handleActivateTournament = async () => {
    if (!nextTournament.tournament || !canEdit) return

    try {
      setActivating(true)
      const response = await fetch(`/api/tournaments/${nextTournament.tournament.id}/activate`, {
        method: 'POST',
        headers: buildAuthHeaders({}, { includeJson: true })
      })

      if (response.ok) {
        // Refresh data
        await fetchTournaments()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al activar torneo')
      }
    } catch (error) {
      console.error('Error activating tournament:', error)
      setError('Error al activar torneo')
    } finally {
      setActivating(false)
    }
  }

  const handleCreateTournament = () => {
    router.push('/tournaments/new')
  }

  const handleEditTournament = (tournamentId: number) => {
    router.push(`/tournaments/${tournamentId}/edit`)
  }

  const handleCardClick = (section: string, tournament: Tournament) => {
    if (!canEdit) return

    switch (section) {
      case 'participants':
        router.push(`/tournaments/${tournament.id}/edit?tab=participants`)
        break
      case 'startDate':
        router.push(`/tournaments/${tournament.id}/edit?tab=dates`)
        break
      case 'endDate':
        // Show completion modal for active tournaments
        if (tournament.status === 'ACTIVO') {
          setShowCompletionModal(true)
        } else {
          router.push(`/tournaments/${tournament.id}/edit?tab=dates`)
        }
        break
    }
  }

  const handleCancelTournament = (tournament: Tournament) => {
    setCancellationType(tournament.status === 'ACTIVO' ? 'active' : 'next')
    setShowCancellationModal(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long'
    })
  }

  const formatNumber = (num: number) => {
    return num.toString().padStart(2, '0')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-poker-dark text-white flex items-center justify-center">
        <LoadingState message="Cargando información de torneos..." size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-poker-dark text-white">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="text-poker-muted hover:text-white hover:bg-white/10 mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Regresar
          </Button>
          <h1 className="text-xl font-bold text-white">
            Poker Enfermos
          </h1>
        </div>

        {/* Active Tournament Section */}
        {activeTournament.tournament ? (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">
                  Torneo {formatNumber(activeTournament.tournament.number)}
                </h2>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-1" />
                  LIVE
                </span>
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancelTournament(activeTournament.tournament!)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Tournament Info Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Participants Card */}
              <button
                onClick={() => handleCardClick('participants', activeTournament.tournament!)}
                disabled={!canEdit}
                className="bg-poker-card border border-white/10 rounded-lg p-4 text-left hover:bg-poker-card/80 transition-all disabled:cursor-default"
              >
                <div className="text-poker-muted text-sm mb-1">Participantes</div>
                <div className="text-2xl font-bold text-white">
                  {activeTournament.tournament._count.tournamentParticipants}
                </div>
              </button>


              {/* Start Date Card */}
              <button
                onClick={() => handleCardClick('startDate', activeTournament.tournament!)}
                disabled={!canEdit}
                className="bg-poker-card border border-white/10 rounded-lg p-4 text-left hover:bg-poker-card/80 transition-all disabled:cursor-default"
              >
                <div className="text-poker-muted text-sm mb-1">Fecha Inicio</div>
                <div className="text-lg font-bold text-white">
                  {activeTournament.stats?.startDate ? (
                    <>
                      {new Date(activeTournament.stats.startDate).getDate()}
                      <div className="text-sm font-normal">
                        {formatDate(activeTournament.stats.startDate)}
                      </div>
                    </>
                  ) : (
                    'N/A'
                  )}
                </div>
              </button>

              {/* End Date Card */}
              <button
                onClick={() => handleCardClick('endDate', activeTournament.tournament!)}
                disabled={!canEdit}
                className="bg-poker-card border border-white/10 rounded-lg p-4 text-left hover:bg-poker-card/80 transition-all disabled:cursor-default"
              >
                <div className="text-poker-muted text-sm mb-1">Fecha Fin</div>
                <div className="text-lg font-bold text-white">
                  {activeTournament.stats?.endDate ? (
                    <>
                      {new Date(activeTournament.stats.endDate).getDate()}
                      <div className="text-sm font-normal">
                        {formatDate(activeTournament.stats.endDate)}
                      </div>
                    </>
                  ) : (
                    'N/A'
                  )}
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="text-center py-8 bg-poker-card border border-white/10 rounded-lg">
              <div className="text-poker-muted text-lg mb-2">No hay torneo activo</div>
            </div>
          </div>
        )}

        {/* Next Tournament Section */}
        <div className="mb-8">
          <div className="text-poker-muted text-sm mb-3">Próximo Torneo</div>
          
          {nextTournament.tournament ? (
            <div className="bg-poker-card border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-poker-muted">Torneo</div>
                  <div className="text-lg font-bold text-white">
                    {formatNumber(nextTournament.tournament.number)}
                  </div>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelTournament(nextTournament.tournament!)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="text-poker-muted">Participantes</span>
                  <div className="font-medium text-white">
                    {nextTournament.tournament._count.tournamentParticipants}
                  </div>
                </div>
                <div>
                  <span className="text-poker-muted">Fecha Inicio</span>
                  <div className="font-medium text-white">
                    {nextTournament.stats?.startDate ? formatDate(nextTournament.stats.startDate) : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-poker-muted">Fecha Fin</span>
                  <div className="font-medium text-white">
                    {nextTournament.stats?.endDate ? formatDate(nextTournament.stats.endDate) : 'N/A'}
                  </div>
                </div>
              </div>
              {canEdit && (
                <Button
                  onClick={() => handleEditTournament(nextTournament.tournament!.id)}
                  className="w-full bg-poker-red hover:bg-red-700 text-white"
                >
                  Editar
                </Button>
              )}
            </div>
          ) : (
            canEdit && (
              <Button
                onClick={handleCreateTournament}
                className="w-full bg-poker-red hover:bg-red-700 text-white py-3"
              >
                <Users className="w-4 h-4 mr-2" />
                Crear
              </Button>
            )
          )}
        </div>

        {/* Activate Button */}
        {nextTournament.tournament && canEdit && (
          <Button
            onClick={handleActivateTournament}
            disabled={!!activeTournament.tournament || activating}
            className={`w-full py-4 text-lg font-bold transition-all ${
              activeTournament.tournament 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-poker-red hover:bg-red-700 text-white'
            }`}
          >
            {activating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Activando...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                ACTIVAR
              </>
            )}
          </Button>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {activeTournament.tournament && (
        <>
          <TournamentCompletionModal
            isOpen={showCompletionModal}
            onClose={() => setShowCompletionModal(false)}
            tournament={activeTournament.tournament}
            onComplete={fetchTournaments}
          />
          <TournamentCancellationModal
            isOpen={showCancellationModal}
            onClose={() => setShowCancellationModal(false)}
            tournament={cancellationType === 'active' ? activeTournament.tournament : nextTournament.tournament}
            onCancel={fetchTournaments}
          />
        </>
      )}
    </div>
  )
}
