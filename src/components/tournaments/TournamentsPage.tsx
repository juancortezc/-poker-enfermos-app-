'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { UserRole, TournamentStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Plus, Trophy, Calendar, Users, Clock } from 'lucide-react'
import { canCRUD } from '@/lib/auth'

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

  const canEdit = canCRUD(user?.role)

  useEffect(() => {
    fetchTournaments()
  }, [activeTab])

  const fetchTournaments = async () => {
    try {
      setLoading(true)
      const status = activeTab === 'activos' ? 'ACTIVO' : 'FINALIZADO'
      const response = await fetch(`/api/tournaments?status=${status}`, {
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        }
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
  }

  const handleCreateTournament = () => {
    router.push('/tournaments/new')
  }

  const handleTournamentClick = (tournamentId: number) => {
    router.push(`/tournaments/${tournamentId}`)
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
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
          <Clock className="w-3 h-3 mr-1" />
          Activo
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
        <Trophy className="w-3 h-3 mr-1" />
        Finalizado
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-red"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Torneos</h1>
          <p className="text-poker-muted">
            {canEdit ? 'Gestionar torneos del grupo' : 'Ver torneos del grupo'}
          </p>
        </div>
        {canEdit && (
          <Button 
            onClick={handleCreateTournament}
            className="bg-poker-red hover:bg-red-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear Torneo
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex justify-center">
        <div className="flex space-x-0">
          <button
            onClick={() => setActiveTab('activos')}
            className={`px-6 py-3 font-medium rounded-l-lg transition-all ${
              activeTab === 'activos'
                ? 'bg-poker-red text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Torneos Activos
          </button>
          <button
            onClick={() => setActiveTab('finalizados')}
            className={`px-6 py-3 font-medium rounded-r-lg transition-all ${
              activeTab === 'finalizados'
                ? 'bg-poker-red text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Finalizados
          </button>
        </div>
      </div>

      {/* Lista de Torneos */}
      <div className="space-y-4">
        {tournaments.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400">
              {activeTab === 'activos' 
                ? 'No hay torneos activos' 
                : 'No hay torneos finalizados'
              }
            </p>
            {canEdit && activeTab === 'activos' && (
              <Button
                onClick={handleCreateTournament}
                className="mt-4 bg-poker-red hover:bg-red-700 text-white"
              >
                Crear primer torneo
              </Button>
            )}
          </div>
        ) : (
          tournaments.map((tournament) => (
            <div
              key={tournament.id}
              onClick={() => handleTournamentClick(tournament.id)}
              className="bg-poker-card border border-white/10 rounded-lg p-6 hover:bg-poker-card/80 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-white">
                      Torneo {tournament.number}
                    </h3>
                    {getStatusBadge(tournament.status)}
                  </div>
                  
                  <h4 className="text-lg text-poker-text mb-3">
                    {tournament.name}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2 text-poker-muted">
                      <Users className="w-4 h-4" />
                      <span>{tournament._count.tournamentParticipants} participantes</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-poker-muted">
                      <Calendar className="w-4 h-4" />
                      <span>12 fechas programadas</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-poker-muted">
                      <Clock className="w-4 h-4" />
                      <span>Creado: {formatDate(tournament.createdAt)}</span>
                    </div>
                  </div>

                  {/* Próxima fecha */}
                  {tournament.gameDates.length > 0 && (
                    <div className="mt-4 p-3 bg-poker-dark/50 rounded-lg">
                      <p className="text-sm text-poker-cyan font-medium">
                        Próxima fecha: {tournament.gameDates.find(d => d.status === 'pending')
                          ? `Fecha ${tournament.gameDates.find(d => d.status === 'pending')?.dateNumber} - ${formatDate(tournament.gameDates.find(d => d.status === 'pending')?.scheduledDate || '')}`
                          : 'Todas las fechas completadas'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}