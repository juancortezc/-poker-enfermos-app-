'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { TournamentStatus, UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2, Calendar, Users, Clock, Trophy } from 'lucide-react'
import { canCRUD } from '@/lib/auth'

interface Tournament {
  id: number
  name: string
  number: number
  status: TournamentStatus
  createdAt: string
  updatedAt: string
  gameDates: Array<{
    id: number
    dateNumber: number
    scheduledDate: string
    status: string
    playersMin: number
    playersMax: number
  }>
  tournamentParticipants: Array<{
    id: number
    confirmed: boolean
    player: {
      id: string
      firstName: string
      lastName: string
      role: UserRole
      photoUrl?: string
      aliases: string[]
    }
  }>
  blindLevels: Array<{
    id: number
    level: number
    smallBlind: number
    bigBlind: number
    duration: number
  }>
}

interface TournamentDetailsProps {
  tournamentId: string
}

export default function TournamentDetails({ tournamentId }: TournamentDetailsProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const canEdit = canCRUD(user?.role)

  useEffect(() => {
    fetchTournament()
  }, [tournamentId])

  const fetchTournament = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTournament(data)
      } else if (response.status === 404) {
        router.push('/tournaments')
      }
    } catch (error) {
      console.error('Error fetching tournament:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    router.push(`/tournaments/${tournamentId}/edit`)
  }

  const handleDelete = async () => {
    if (deleteConfirmText !== 'CANCELAR') return

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        router.push('/tournaments')
      }
    } catch (error) {
      console.error('Error deleting tournament:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: TournamentStatus) => {
    if (status === 'ACTIVO') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
          <Clock className="w-4 h-4 mr-1" />
          Activo
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-500/20 text-gray-400">
        <Trophy className="w-4 h-4 mr-1" />
        Finalizado
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-red"></div>
      </div>
    )
  }

  if (!tournament) {
    return null
  }

  return (
    <div className="min-h-screen bg-poker-dark pb-safe">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/tournaments')}
              className="text-poker-muted hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                Torneo {tournament.number}
                {getStatusBadge(tournament.status)}
              </h1>
              <p className="text-poker-muted">{tournament.name}</p>
            </div>
          </div>

          {canEdit && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleEdit}
                className="border-white/20 text-white hover:bg-white/5"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(true)}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fechas del Torneo */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-poker-card border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Fechas del Torneo
              </h2>
              
              <div className="space-y-3">
                {tournament.gameDates.map((date) => (
                  <div
                    key={date.id}
                    className="flex items-center justify-between p-3 bg-poker-dark/50 rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium text-white">Fecha {date.dateNumber}</h4>
                      <p className="text-sm text-poker-muted">{formatDate(date.scheduledDate)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-poker-muted">
                        {date.playersMin}-{date.playersMax} jugadores
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        date.status === 'pending' 
                          ? 'bg-yellow-500/20 text-yellow-400' 
                          : date.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {date.status === 'pending' ? 'Pendiente' : 
                         date.status === 'completed' ? 'Completada' : 
                         'Cancelada'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Estructura de Blinds */}
            <div className="bg-poker-card border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Estructura de Blinds
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-poker-muted">Nivel</th>
                      <th className="text-left py-2 text-poker-muted">Small</th>
                      <th className="text-left py-2 text-poker-muted">Big</th>
                      <th className="text-left py-2 text-poker-muted">Tiempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournament.blindLevels.map((blind) => (
                      <tr key={blind.id} className="border-b border-white/5">
                        <td className="py-2 text-white font-medium">{blind.level}</td>
                        <td className="py-2 text-poker-text">{blind.smallBlind.toLocaleString()}</td>
                        <td className="py-2 text-poker-text">{blind.bigBlind.toLocaleString()}</td>
                        <td className="py-2 text-poker-muted">{blind.duration} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Participantes */}
          <div className="space-y-4">
            <div className="bg-poker-card border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Participantes ({tournament.tournamentParticipants.length})
              </h2>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tournament.tournamentParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center space-x-3 p-2 hover:bg-poker-dark/50 rounded-lg"
                  >
                    {participant.player.photoUrl ? (
                      <img
                        src={participant.player.photoUrl}
                        alt={`${participant.player.firstName} ${participant.player.lastName}`}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-sm text-gray-300">
                          {participant.player.firstName[0]}{participant.player.lastName[0]}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        {participant.player.firstName} {participant.player.lastName}
                      </p>
                      {participant.player.aliases[0] && (
                        <p className="text-xs text-poker-cyan">{participant.player.aliases[0]}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      participant.player.role === UserRole.Comision 
                        ? 'bg-poker-red text-white' 
                        : 'bg-gray-300 text-black'
                    }`}>
                      {participant.player.role === UserRole.Comision ? 'Comisión' : 'Enfermo'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Cancelación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-poker-card border border-white/10 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              Eliminar Torneo {tournament.number}
            </h3>
            <p className="text-poker-muted mb-4">
              Esta acción eliminará permanentemente el torneo y toda su información asociada.
              Esta acción no se puede deshacer.
            </p>
            <div className="mb-4">
              <Label htmlFor="confirm" className="text-poker-text mb-2 block">
                Escribe <span className="font-bold text-poker-red">CANCELAR</span> para confirmar:
              </Label>
              <Input
                id="confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="bg-poker-dark/50 border-white/10 text-white focus:border-poker-red"
                placeholder="CANCELAR"
              />
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                }}
                className="flex-1 border-white/20 text-white hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteConfirmText !== 'CANCELAR'}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Eliminar Torneo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'