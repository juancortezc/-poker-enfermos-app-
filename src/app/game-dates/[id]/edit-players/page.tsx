'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Users, AlertTriangle } from 'lucide-react'
import { toast } from 'react-toastify'
import PlayerSelector from '@/components/game-dates/PlayerSelector'

interface GameDate {
  id: number
  dateNumber: number
  scheduledDate: string
  status: string
  playerIds: string[]
  tournament: {
    id: number
    name: string
    number: number
  }
}

interface Player {
  id: string
  firstName: string
  lastName: string
  role: string
  photoUrl?: string
  isActive: boolean
}

export default function EditPlayersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const [gameDate, setGameDate] = useState<GameDate | null>(null)
  const [registeredPlayers, setRegisteredPlayers] = useState<Player[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const gameDateId = params.id as string

  useEffect(() => {
    if (user && gameDateId) {
      fetchGameDateAndPlayers()
    }
  }, [user, gameDateId])

  const fetchGameDateAndPlayers = async () => {
    try {
      setLoading(true)
      
      // Fetch game date details
      const gameDateResponse = await fetch(`/api/game-dates/${gameDateId}`, {
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!gameDateResponse.ok) {
        throw new Error('Error al cargar la fecha')
      }

      const gameDateData = await gameDateResponse.json()
      setGameDate(gameDateData.gameDate)
      setSelectedPlayers(gameDateData.gameDate.playerIds)

      // Fetch available players
      const playersResponse = await fetch('/api/game-dates/available-dates', {
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (playersResponse.ok) {
        const playersData = await playersResponse.json()
        setRegisteredPlayers(playersData.registeredPlayers || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error al cargar los datos')
      router.push(`/game-dates/${gameDateId}/confirm`)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!gameDate) return

    // Si la fecha ya está iniciada, requerir confirmación
    if (gameDate.status === 'in_progress' && !showConfirmation) {
      setShowConfirmation(true)
      return
    }

    try {
      setSaving(true)
      
      const response = await fetch(`/api/game-dates/${gameDateId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update',
          playerIds: selectedPlayers,
          guestIds: [] // Mantenemos los invitados actuales
        })
      })

      if (response.ok) {
        toast.success('Participantes actualizados exitosamente')
        router.push(`/game-dates/${gameDateId}/confirm`)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Error al actualizar participantes')
      }
    } catch (error) {
      console.error('Error saving players:', error)
      toast.error('Error al guardar cambios')
    } finally {
      setSaving(false)
      setShowConfirmation(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-poker-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-red mx-auto mb-4"></div>
          <p className="text-poker-muted">Cargando participantes...</p>
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
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/game-dates/${gameDateId}/confirm`)}
            className="text-poker-muted hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-xl font-bold text-white">
            Editar Participantes - Fecha {gameDate.dateNumber}
          </h1>
        </div>

        {/* Warning for in-progress game */}
        {gameDate.status === 'in_progress' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-yellow-400 font-medium mb-1">¡Fecha en progreso!</h4>
                <p className="text-yellow-300 text-sm">
                  Esta fecha ya está en progreso. Los cambios en los participantes pueden afectar 
                  el desarrollo del juego. Asegúrate de comunicar cualquier cambio a los jugadores.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Player Selector */}
        <PlayerSelector
          players={registeredPlayers}
          selectedPlayers={selectedPlayers}
          onPlayersChange={setSelectedPlayers}
          onNext={handleSave}
          onBack={() => router.push(`/game-dates/${gameDateId}/confirm`)}
          nextButtonText="Actualizar Participantes"
          nextButtonIcon={<Save className="w-4 h-4 ml-2" />}
        />

        {/* Confirmation Dialog */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="bg-poker-card border-white/10 max-w-md w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Confirmar cambios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-poker-text">
                  ¿Estás seguro de modificar los participantes de una fecha que ya está en progreso?
                </p>
                <p className="text-sm text-poker-muted">
                  Esto puede afectar el desarrollo del juego actual. Asegúrate de informar a todos los jugadores.
                </p>
                <div className="flex space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 border-white/20 text-poker-text hover:bg-white/5"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-poker-red hover:bg-red-700 text-white"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-b-transparent"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Confirmar cambios
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}