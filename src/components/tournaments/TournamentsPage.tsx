'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { UserRole, TournamentStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import ProgressBar, { CircularProgress } from '@/components/ui/ProgressBar'
import LoadingState, { CardSkeleton } from '@/components/ui/LoadingState'
import { Plus, Trophy, Calendar, Users, Clock, CheckCircle } from 'lucide-react'
import TournamentCompletionModal from './TournamentCompletionModal'
import { buildAuthHeaders } from '@/lib/client-auth'

interface Tournament {
  id: number
  name: string
  number: number
  status: TournamentStatus
  createdAt: string
  gameDates: Array<{
    id: number
    dateNumber: number
    scheduledDate: string
    status: string
  }>
  tournamentParticipants: Array<{
    player: {
      id: string
      firstName: string
      lastName: string
      role: UserRole
      photoUrl?: string
    }
  }>
  _count: {
    tournamentParticipants: number
    gameDates: number
  }
}

export default function TournamentsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'activos' | 'finalizados'>('activos')
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)

  const canEdit = user?.role === 'Comision'

  const fetchTournaments = useCallback(async () => {
    try {
      setLoading(true)
      const status = activeTab === 'activos' ? 'ACTIVO' : 'FINALIZADO'
      const response = await fetch(`/api/tournaments?status=${status}`, {
        headers: buildAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setTournaments(data)
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchTournaments()
  }, [fetchTournaments])

  const handleCreateTournament = () => {
    router.push('/tournaments/new')
  }

  const handleTournamentClick = (tournamentId: number) => {
    router.push(`/tournaments/${tournamentId}`)
  }

  const handleFinalizeTournament = (e: React.MouseEvent, tournament: Tournament) => {
    e.stopPropagation() // Prevent card click
    setSelectedTournament(tournament)
    setShowCompletionModal(true)
  }

  const handleCompletionSuccess = () => {
    setShowCompletionModal(false)
    setSelectedTournament(null)
    fetchTournaments()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: TournamentStatus) => {
    if (status === 'ACTIVO') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
          <Clock className="w-3 h-3 mr-1" />
          Activo
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#8d7052]/20 text-[#e8e3e3] border border-[#8d7052]/30">
        <Trophy className="w-3 h-3 mr-1" />
        Finalizado
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingState message="Cargando torneos..." size="md" />
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#171619] via-[#0f0a04] to-[#0a0703] pb-24 pt-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-bold text-[#F5EFE6] tracking-tight">Torneos</h1>
          {canEdit && (
            <Button
              onClick={handleCreateTournament}
              className="bg-[#C2410C] hover:bg-[#9A3309] text-[#F5EFE6] self-start md:self-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Torneo
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border border-[#E53935]/20 bg-[#2A292B]/60 p-1">
            <button
              onClick={() => setActiveTab('activos')}
              className={`px-6 py-3 font-semibold rounded-lg text-sm uppercase tracking-wider transition-all ${
                activeTab === 'activos'
                  ? 'bg-[#C2410C] text-[#F5EFE6] shadow-lg'
                  : 'bg-transparent text-[#e8e3e3] hover:text-[#F5EFE6] hover:bg-[#201F22]/40'
              }`}
            >
              Torneos Activos
            </button>
            <button
              onClick={() => setActiveTab('finalizados')}
              className={`px-6 py-3 font-semibold rounded-lg text-sm uppercase tracking-wider transition-all ${
                activeTab === 'finalizados'
                  ? 'bg-[#C2410C] text-[#F5EFE6] shadow-lg'
                  : 'bg-transparent text-[#e8e3e3] hover:text-[#F5EFE6] hover:bg-[#201F22]/40'
              }`}
            >
              Finalizados
            </button>
          </div>
        </div>

        {/* Lista de Torneos */}
        <div className="space-y-4">
          {tournaments.length === 0 ? (
            <div className="text-center py-12 bg-[#2A292B]/40 rounded-3xl border border-[#E53935]/20">
              <Trophy className="w-16 h-16 mx-auto text-[#e8e3e3] mb-4" />
              <p className="text-[#e8e3e3]">
                {activeTab === 'activos'
                  ? 'No hay torneos activos'
                  : 'No hay torneos finalizados'
                }
              </p>
              {canEdit && activeTab === 'activos' && (
                <Button
                  onClick={handleCreateTournament}
                  className="mt-4 bg-[#C2410C] hover:bg-[#9A3309] text-[#F5EFE6]"
                >
                  Crear primer torneo
                </Button>
              )}
            </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tournaments.map((tournament) => {
              const completedDates = tournament.gameDates.filter(d => d.status === 'completed').length
              const totalDates = tournament.gameDates.length || 12
              // const progressPercentage = (completedDates / totalDates) * 100 // Para uso futuro
            
              return (
                <div
                  key={tournament.id}
                  onClick={() => handleTournamentClick(tournament.id)}
                  className="bg-gradient-to-br from-[#2A292B] via-[#201F22] to-[#171619] border border-[#E53935]/20 rounded-xl p-6 hover:border-[#E53935]/40 cursor-pointer transition-all group hover:-translate-y-1 hover:shadow-lg hover:shadow-[#E53935]/10 flex flex-col h-full"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-[#F5EFE6] group-hover:text-[#FF6B6B] transition-colors truncate">
                          Torneo {tournament.number}
                        </h3>
                        {getStatusBadge(tournament.status)}
                      </div>

                      <h4 className="text-lg text-[#e8e3e3] mb-4 truncate">
                        {tournament.name}
                      </h4>

                      {/* Progress section para torneos activos */}
                      {tournament.status === 'ACTIVO' && (
                        <div className="mb-4 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#e8e3e3]">Progreso del torneo</span>
                            <span className="text-[#FF6B6B] font-medium">{completedDates}/{totalDates} fechas</span>
                          </div>
                          <ProgressBar
                            value={completedDates}
                            max={totalDates}
                            color={completedDates === totalDates ? 'green' : 'cyan'}
                            size="md"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                        <div className="flex items-center space-x-2 text-[#e8e3e3]">
                          <Users className="w-4 h-4 text-[#FF6B6B]" />
                          <span>{tournament._count.tournamentParticipants} participantes</span>
                        </div>

                        <div className="flex items-center space-x-2 text-[#e8e3e3]">
                          <Calendar className="w-4 h-4 text-[#10b981]" />
                          <span>{completedDates}/{totalDates} fechas</span>
                        </div>

                        <div className="flex items-center space-x-2 text-[#e8e3e3]">
                          <Clock className="w-4 h-4 text-[#FF6B6B]" />
                          <span>{formatDate(tournament.createdAt)}</span>
                        </div>
                      </div>

                      {/* Finalize Tournament Button - Only for Comision and active tournaments */}
                      {canEdit && tournament.status === 'ACTIVO' && (
                        <Button
                          onClick={(e) => handleFinalizeTournament(e, tournament)}
                          className={`w-full mt-2 ${
                            completedDates === totalDates
                              ? 'bg-[#10b981] hover:bg-[#059669] text-white'
                              : 'bg-transparent border border-[#C2410C]/50 text-[#C2410C] hover:bg-[#C2410C]/10'
                          }`}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {completedDates === totalDates ? 'Finalizar Torneo' : 'Finalizar Anticipadamente'}
                        </Button>
                      )}
                    </div>

                    {/* Circular progress para vista rápida */}
                    {tournament.status === 'ACTIVO' && (
                      <div className="flex-shrink-0">
                        <CircularProgress
                          value={completedDates}
                          max={totalDates}
                          size={68}
                          strokeWidth={6}
                          color={completedDates === totalDates ? 'green' : 'cyan'}
                          showValue
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </div>
      </div>

      {/* Completion Modal */}
      {selectedTournament && (
        <TournamentCompletionModal
          isOpen={showCompletionModal}
          onClose={() => {
            setShowCompletionModal(false)
            setSelectedTournament(null)
          }}
          tournament={selectedTournament}
          onComplete={handleCompletionSuccess}
        />
      )}
    </div>
  )
}
