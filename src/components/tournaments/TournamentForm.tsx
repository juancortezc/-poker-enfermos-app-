'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save, Loader2, Calendar, Users, Clock } from 'lucide-react'

interface Player {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  photoUrl?: string
  isActive: boolean
}

interface BlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
  duration: number
}

interface FormData {
  name: string
  gameDates: Array<{
    dateNumber: number
    scheduledDate: string
  }>
  participantIds: string[]
  blindLevels: BlindLevel[]
}

const DEFAULT_BLIND_LEVELS: BlindLevel[] = [
  { level: 1, smallBlind: 50, bigBlind: 100, duration: 12 },
  { level: 2, smallBlind: 100, bigBlind: 200, duration: 12 },
  { level: 3, smallBlind: 150, bigBlind: 300, duration: 12 },
  { level: 4, smallBlind: 200, bigBlind: 400, duration: 12 },
  { level: 5, smallBlind: 300, bigBlind: 600, duration: 12 },
  { level: 6, smallBlind: 400, bigBlind: 800, duration: 12 },
  { level: 7, smallBlind: 500, bigBlind: 1000, duration: 16 },
  { level: 8, smallBlind: 1500, bigBlind: 3000, duration: 16 },
  { level: 9, smallBlind: 2000, bigBlind: 4000, duration: 16 },
  { level: 10, smallBlind: 3000, bigBlind: 6000, duration: 16 },
  { level: 11, smallBlind: 4000, bigBlind: 8000, duration: 16 },
  { level: 12, smallBlind: 5000, bigBlind: 10000, duration: 10 },
  { level: 13, smallBlind: 6000, bigBlind: 12000, duration: 10 },
  { level: 14, smallBlind: 7000, bigBlind: 14000, duration: 10 },
  { level: 15, smallBlind: 8000, bigBlind: 16000, duration: 10 },
  { level: 16, smallBlind: 9000, bigBlind: 18000, duration: 10 },
  { level: 17, smallBlind: 10000, bigBlind: 20000, duration: 10 }
]

export default function TournamentForm({ tournamentId }: { tournamentId?: string }) {
  const { user } = useAuth()
  const router = useRouter()
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'basic' | 'dates' | 'participants' | 'blinds'>('basic')

  const isEditing = !!tournamentId

  const [formData, setFormData] = useState<FormData>({
    name: '',
    gameDates: Array.from({ length: 12 }, (_, i) => ({
      dateNumber: i + 1,
      scheduledDate: ''
    })),
    participantIds: [],
    blindLevels: DEFAULT_BLIND_LEVELS
  })

  // Verificar permisos
  useEffect(() => {
    if (user && user.role !== UserRole.Comision) {
      router.push('/tournaments')
      return
    }
  }, [user, router])

  // Cargar jugadores disponibles (Enfermos y Comisión activos)
  useEffect(() => {
    if (user?.adminKey) {
      fetchAvailablePlayers()
    }
  }, [user?.adminKey])

  const fetchAvailablePlayers = async () => {
    try {
      const response = await fetch('/api/players?role=Enfermo,Comision', {
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const activePlayers = data.filter((p: Player) => p.isActive)
        setAvailablePlayers(activePlayers)
      }
    } catch (err) {
      console.error('Error fetching players:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validaciones
      if (!formData.name.trim()) {
        throw new Error('El nombre del torneo es obligatorio')
      }

      const validDates = formData.gameDates.filter(d => d.scheduledDate)
      if (validDates.length !== 12) {
        throw new Error('Debe programar las 12 fechas')
      }

      if (formData.participantIds.length === 0) {
        throw new Error('Debe seleccionar al menos un participante')
      }

      const submitData = {
        name: formData.name.trim(),
        gameDates: formData.gameDates.map(d => ({
          dateNumber: d.dateNumber,
          scheduledDate: d.scheduledDate
        })),
        participantIds: formData.participantIds,
        blindLevels: formData.blindLevels
      }

      const url = isEditing ? `/api/tournaments/${tournamentId}` : '/api/tournaments'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar torneo')
      }

      router.push('/tournaments')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateGameDate = (index: number, scheduledDate: string) => {
    const newDates = [...formData.gameDates]
    newDates[index].scheduledDate = scheduledDate
    updateFormData('gameDates', newDates)
  }

  const toggleParticipant = (playerId: string) => {
    const newParticipants = formData.participantIds.includes(playerId)
      ? formData.participantIds.filter(id => id !== playerId)
      : [...formData.participantIds, playerId]
    
    updateFormData('participantIds', newParticipants)
  }

  const updateBlindLevel = (index: number, field: keyof BlindLevel, value: number) => {
    const newBlinds = [...formData.blindLevels]
    newBlinds[index] = { ...newBlinds[index], [field]: value }
    updateFormData('blindLevels', newBlinds)
  }

  if (!user || user.role !== UserRole.Comision) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-poker-muted">Sin permisos para acceder a esta página</p>
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
            onClick={() => router.push('/tournaments')}
            className="text-poker-muted hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-xl font-bold text-white">
            {isEditing ? 'Editar Torneo' : 'Nuevo Torneo'}
          </h1>
        </div>

        {/* Tabs de navegación */}
        <div className="flex space-x-1 bg-poker-card rounded-lg p-1">
          {[
            { key: 'basic', label: 'Información', icon: Save },
            { key: 'dates', label: 'Fechas', icon: Calendar },
            { key: 'participants', label: 'Participantes', icon: Users },
            { key: 'blinds', label: 'Blinds', icon: Clock }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                activeTab === key
                  ? 'bg-poker-red text-white shadow-lg'
                  : 'text-poker-muted hover:text-poker-text'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tab: Información Básica */}
          {activeTab === 'basic' && (
            <div className="space-y-4 bg-poker-card p-6 rounded-lg border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Información del Torneo</h3>
              
              <div>
                <Label htmlFor="name" className="text-poker-text">Nombre del Torneo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  className="bg-poker-dark/50 border-white/10 text-white focus:border-poker-red"
                  placeholder="Ej: Torneo de Verano 2024"
                  required
                />
              </div>

              <div className="text-sm text-poker-muted">
                <p>• El torneo constará de 12 fechas (noches de juego)</p>
                <p>• Solo Enfermos y Comisión pueden participar en el ranking</p>
                <p>• La numeración será automática (siguiente número disponible)</p>
              </div>
            </div>
          )}

          {/* Tab: Fechas */}
          {activeTab === 'dates' && (
            <div className="space-y-4 bg-poker-card p-6 rounded-lg border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Programar las 12 Fechas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {formData.gameDates.map((gameDate, index) => (
                  <div key={index} className="space-y-2">
                    <Label className="text-poker-text">Fecha {gameDate.dateNumber}</Label>
                    <Input
                      type="date"
                      value={gameDate.scheduledDate}
                      onChange={(e) => updateGameDate(index, e.target.value)}
                      className="bg-poker-dark/50 border-white/10 text-white focus:border-poker-red"
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Participantes */}
          {activeTab === 'participants' && (
            <div className="space-y-4 bg-poker-card p-6 rounded-lg border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">
                Seleccionar Participantes ({formData.participantIds.length} seleccionados)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availablePlayers.map((player) => (
                  <label
                    key={player.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all border ${
                      formData.participantIds.includes(player.id)
                        ? 'bg-poker-red/20 border-poker-red'
                        : 'bg-poker-dark/50 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.participantIds.includes(player.id)}
                      onChange={() => toggleParticipant(player.id)}
                      className="rounded border-gray-300 text-poker-red focus:ring-poker-red"
                    />
                    <div className="flex items-center space-x-2">
                      {player.photoUrl ? (
                        <img
                          src={player.photoUrl}
                          alt={`${player.firstName} ${player.lastName}`}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-xs text-gray-300">
                            {player.firstName[0]}{player.lastName[0]}
                          </span>
                        </div>
                      )}
                      <span className="text-white">
                        {player.firstName} {player.lastName}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        player.role === UserRole.Comision 
                          ? 'bg-poker-red text-white' 
                          : 'bg-gray-300 text-black'
                      }`}>
                        {player.role === UserRole.Comision ? 'Comisión' : 'Enfermo'}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Blinds */}
          {activeTab === 'blinds' && (
            <div className="space-y-4 bg-poker-card p-6 rounded-lg border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Estructura de Blinds</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-poker-text">Nivel</th>
                      <th className="text-left py-2 text-poker-text">Small Blind</th>
                      <th className="text-left py-2 text-poker-text">Big Blind</th>
                      <th className="text-left py-2 text-poker-text">Tiempo (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.blindLevels.map((blind, index) => (
                      <tr key={blind.level} className="border-b border-white/5">
                        <td className="py-2 text-white font-medium">{blind.level}</td>
                        <td className="py-2">
                          <Input
                            type="number"
                            value={blind.smallBlind}
                            onChange={(e) => updateBlindLevel(index, 'smallBlind', parseInt(e.target.value))}
                            className="w-20 bg-poker-dark/50 border-white/10 text-white focus:border-poker-red text-sm"
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            type="number"
                            value={blind.bigBlind}
                            onChange={(e) => updateBlindLevel(index, 'bigBlind', parseInt(e.target.value))}
                            className="w-20 bg-poker-dark/50 border-white/10 text-white focus:border-poker-red text-sm"
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            type="number"
                            value={blind.duration}
                            onChange={(e) => updateBlindLevel(index, 'duration', parseInt(e.target.value))}
                            className="w-16 bg-poker-dark/50 border-white/10 text-white focus:border-poker-red text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/tournaments')}
              className="flex-1 border-white/20 text-poker-text hover:bg-white/5"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-poker-red hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? 'Actualizar' : 'Crear Torneo'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}