'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Play, Calendar, Users, Trophy, Clock, Target } from 'lucide-react'
import { toast } from 'react-toastify'

interface GameDate {
  id: number
  dateNumber: number
  scheduledDate: string
  status: string
  playerIds: string[]
  totalParticipants: number
  playersCount: number
  tournament: {
    id: number
    name: string
    number: number
  }
}

export default function GameDateConfirmPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const [gameDate, setGameDate] = useState<GameDate | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  const gameDateId = params.id as string

  useEffect(() => {
    if (user && gameDateId) {
      fetchGameDate()
    }
  }, [user, gameDateId])

  const fetchGameDate = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/game-dates/${gameDateId}`, {
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setGameDate(data.gameDate)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Error al cargar la fecha')
        router.push('/admin')
      }
    } catch (error) {
      console.error('Error fetching game date:', error)
      toast.error('Error al cargar la fecha')
      router.push('/admin')
    } finally {
      setLoading(false)
    }
  }

  const handleStartGame = async () => {
    if (!gameDate) return

    try {
      setStarting(true)
      const response = await fetch(`/api/game-dates/${gameDateId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'start' })
      })

      if (response.ok) {
        toast.success('¡Fecha iniciada exitosamente!')
        router.push('/registro')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Error al iniciar la fecha')
      }
    } catch (error) {
      console.error('Error starting game:', error)
      toast.error('Error al iniciar la fecha')
    } finally {
      setStarting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const canStartGame = user?.role === 'Comision'

  if (loading) {
    return (
      <div className="min-h-screen bg-poker-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-red mx-auto mb-4"></div>
          <p className="text-poker-muted">Cargando información de la fecha...</p>
        </div>
      </div>
    )
  }

  if (!gameDate) {
    return (
      <div className="min-h-screen bg-poker-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-poker-muted">Fecha no encontrada</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-poker-dark">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin')}
            className="text-poker-muted hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>

        {/* Main Card */}
        <Card className="bg-poker-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <Target className="w-6 h-6 text-poker-cyan" />
              Confirmar Inicio de Fecha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Game Date Summary */}
            <div className="bg-poker-dark/30 rounded-lg p-6 space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Fecha {gameDate.dateNumber}
                </h2>
                <p className="text-poker-cyan font-medium">
                  {gameDate.tournament.name}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="bg-poker-card rounded-lg p-3">
                    <Calendar className="w-6 h-6 text-poker-cyan mx-auto mb-2" />
                    <p className="text-xs text-poker-muted">Fecha</p>
                    <p className="text-sm font-semibold text-white">
                      {formatDate(gameDate.scheduledDate)}
                    </p>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="bg-poker-card rounded-lg p-3">
                    <Users className="w-6 h-6 text-poker-green mx-auto mb-2" />
                    <p className="text-xs text-poker-muted">Participantes</p>
                    <p className="text-sm font-semibold text-white">
                      {gameDate.playersCount}
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <div className="bg-poker-card rounded-lg p-3">
                    <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                    <p className="text-xs text-poker-muted">Torneo</p>
                    <p className="text-sm font-semibold text-white">
                      #{gameDate.tournament.number}
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <div className="bg-poker-card rounded-lg p-3">
                    <Clock className="w-6 h-6 text-poker-red mx-auto mb-2" />
                    <p className="text-xs text-poker-muted">Estado</p>
                    <p className="text-sm font-semibold text-white capitalize">
                      {gameDate.status === 'pending' ? 'Pendiente' : gameDate.status}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 text-yellow-400 mt-0.5">⚠️</div>
                <div>
                  <h4 className="text-yellow-400 font-medium mb-1">¡Atención!</h4>
                  <p className="text-yellow-300 text-sm">
                    Al iniciar la fecha, se activará automáticamente el timer y no podrás deshacer esta acción.
                    Asegúrate de que todos los participantes estén listos.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4">
              <Button
                variant="outline"
                onClick={() => router.push('/admin')}
                className="flex-1 border-white/20 text-poker-text hover:bg-white/5"
              >
                Cancelar
              </Button>
              
              {canStartGame && (
                <Button
                  onClick={handleStartGame}
                  disabled={starting || gameDate.status !== 'pending'}
                  className="flex-1 bg-poker-red hover:bg-red-700 text-white"
                >
                  {starting ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-b-transparent"></div>
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Iniciar Fecha
                    </>
                  )}
                </Button>
              )}
            </div>

            {!canStartGame && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm text-center">
                  Solo los usuarios de la Comisión pueden iniciar fechas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}