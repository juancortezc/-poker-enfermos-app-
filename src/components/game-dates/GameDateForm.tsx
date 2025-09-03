'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Loader2, Calendar, Users, UserPlus, Trophy } from 'lucide-react'
import PlayerSelector from './PlayerSelector'
import GuestSelector from './GuestSelector'
import GameDateSummary from './GameDateSummary'

interface Player {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  photoUrl?: string
  isActive: boolean
}

interface Tournament {
  id: number
  name: string
  number: number
}

interface NextDate {
  dateNumber: number
  scheduledDate: string
}

interface ActiveDate {
  id: number
  dateNumber: number
  scheduledDate: string
  status: string
  playerIds: string[]
  tournament: Tournament
  playersCount: number
}

type Step = 'loading' | 'date-info' | 'select-players' | 'add-guests' | 'confirm' | 'summary'

export default function GameDateForm() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState<Step>('loading')

  // Data states
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [nextDate, setNextDate] = useState<NextDate | null>(null)
  const [activeDate, setActiveDate] = useState<ActiveDate | null>(null)
  const [registeredPlayers, setRegisteredPlayers] = useState<Player[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [selectedGuests, setSelectedGuests] = useState<string[]>([])
  const [createdGameDate, setCreatedGameDate] = useState<any>(null)

  // Verificar permisos
  useEffect(() => {
    if (user && user.role !== UserRole.Comision) {
      router.push('/admin')
      return
    }
  }, [user, router])

  // Cargar datos iniciales
  useEffect(() => {
    if (user?.adminKey) {
      loadInitialData()
    }
  }, [user?.adminKey])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // Verificar si hay fecha activa
      const activeResponse = await fetch('/api/game-dates/active', {
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (activeResponse.ok) {
        const activeData = await activeResponse.json()
        
        if (activeData.activeDate) {
          setActiveDate(activeData.activeDate)
          setCurrentStep('summary')
          setLoading(false)
          return
        }
      }

      // Si no hay fecha activa, obtener próxima disponible
      const nextResponse = await fetch('/api/game-dates/next-available', {
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (nextResponse.ok) {
        const nextData = await nextResponse.json()
        setTournament(nextData.tournament)
        setNextDate(nextData.nextDate)
        setRegisteredPlayers(nextData.registeredPlayers)
        setSelectedPlayers(nextData.registeredPlayers.map((p: Player) => p.id))
        setCurrentStep('date-info')
      } else {
        const errorData = await nextResponse.json()
        setError(errorData.error || 'Error al cargar datos')
      }
    } catch (err) {
      setError('Error al cargar datos iniciales')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGameDate = async () => {
    if (!tournament || !nextDate) return

    try {
      setSaving(true)
      setError('')

      const response = await fetch('/api/game-dates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tournamentId: tournament.id,
          dateNumber: nextDate.dateNumber,
          scheduledDate: nextDate.scheduledDate,
          playerIds: selectedPlayers,
          guestIds: selectedGuests
        })
      })

      if (response.ok) {
        const result = await response.json()
        setCreatedGameDate(result.gameDate)
        setCurrentStep('summary')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al crear fecha')
      }
    } catch (err) {
      setError('Error al crear fecha de juego')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!user || user.role !== UserRole.Comision) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-poker-muted">Sin permisos para acceder a esta página</p>
      </div>
    )
  }

  if (loading || currentStep === 'loading') {
    return (
      <div className="min-h-screen bg-poker-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-red mx-auto mb-4"></div>
          <p className="text-poker-muted">Cargando información...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-poker-dark pb-safe">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin')}
            className="text-poker-muted hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-xl font-bold text-white">
            {currentStep === 'summary' ? 'Fecha Creada' : 'Nueva Fecha de Juego'}
          </h1>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Date Info */}
        {currentStep === 'date-info' && tournament && nextDate && (
          <Card className="bg-poker-card border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="w-5 h-5" />
                Información de la Fecha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-poker-muted mb-1">Torneo</p>
                  <p className="text-lg font-semibold text-white">
                    Torneo {tournament.number}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-poker-muted mb-1">Número de Fecha</p>
                  <p className="text-lg font-semibold text-poker-cyan">
                    Fecha {nextDate.dateNumber}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-poker-muted mb-1">Fecha Programada</p>
                  <p className="text-lg font-semibold text-white">
                    {new Date(nextDate.scheduledDate).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              <div className="pt-4">
                <Button
                  onClick={() => setCurrentStep('select-players')}
                  className="w-full bg-poker-red hover:bg-red-700 text-white"
                >
                  Continuar a Selección de Jugadores
                  <Users className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Players */}
        {currentStep === 'select-players' && (
          <PlayerSelector
            players={registeredPlayers}
            selectedPlayers={selectedPlayers}
            onPlayersChange={setSelectedPlayers}
            onNext={() => setCurrentStep('add-guests')}
            onBack={() => setCurrentStep('date-info')}
          />
        )}

        {/* Step 3: Add Guests */}
        {currentStep === 'add-guests' && tournament && (
          <GuestSelector
            tournamentId={tournament.id}
            selectedGuests={selectedGuests}
            onGuestsChange={setSelectedGuests}
            onNext={() => setCurrentStep('confirm')}
            onBack={() => setCurrentStep('select-players')}
          />
        )}

        {/* Step 4: Confirm */}
        {currentStep === 'confirm' && tournament && nextDate && (
          <Card className="bg-poker-card border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Trophy className="w-5 h-5" />
                Confirmar Creación de Fecha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-poker-dark/30 p-4 rounded-lg space-y-2">
                <p className="text-poker-text"><strong>Torneo:</strong> {tournament.number}</p>
                <p className="text-poker-text"><strong>Fecha:</strong> {nextDate.dateNumber}</p>
                <p className="text-poker-text"><strong>Día:</strong> {new Date(nextDate.scheduledDate).toLocaleDateString('es-ES')}</p>
                <p className="text-poker-text"><strong>Jugadores registrados:</strong> {selectedPlayers.length}</p>
                <p className="text-poker-text"><strong>Invitados:</strong> {selectedGuests.length}</p>
                <p className="text-poker-text"><strong>Total participantes:</strong> {selectedPlayers.length + selectedGuests.length}</p>
              </div>

              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('add-guests')}
                  className="flex-1 border-white/20 text-poker-text hover:bg-white/5"
                >
                  Volver
                </Button>
                <Button
                  onClick={handleCreateGameDate}
                  disabled={saving}
                  className="flex-1 bg-poker-red hover:bg-red-700 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Crear Fecha
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Summary */}
        {currentStep === 'summary' && (activeDate || createdGameDate) && (
          <GameDateSummary
            gameDate={activeDate || createdGameDate}
            onEdit={() => {
              // TODO: Implementar edición
              setCurrentStep('select-players')
            }}
          />
        )}
      </div>
    </div>
  )
}