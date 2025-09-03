'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { ArrowLeft, Save, Loader2, Calendar, Users, Clock, Plus, X, Check } from 'lucide-react'

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
  tournamentNumber: number
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
  const [tournamentNumber, setTournamentNumber] = useState<number>(0)
  const [showBlindsConfirm, setShowBlindsConfirm] = useState(false)
  const [pendingBlindLevels, setPendingBlindLevels] = useState<BlindLevel[]>([])
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)
  
  const isEditing = !!tournamentId
  const [activeTab, setActiveTab] = useState<'participants' | 'blinds' | 'dates'>('participants')

  // Función para obtener el próximo martes
  const getNextTuesday = (date: Date = new Date()): Date => {
    const nextTuesday = new Date(date)
    const dayOfWeek = nextTuesday.getDay() // 0 = domingo, 1 = lunes, ..., 2 = martes
    
    if (dayOfWeek === 2) {
      // Si es martes, usar este martes o el siguiente si es para fechas iniciales
      return nextTuesday
    } else {
      // Calcular días hasta el próximo martes
      const daysUntilTuesday = (2 + 7 - dayOfWeek) % 7
      nextTuesday.setDate(nextTuesday.getDate() + daysUntilTuesday)
      return nextTuesday
    }
  }

  // Función para generar fechas iniciales
  const generateInitialDates = () => {
    const nextTuesday = getNextTuesday()
    const dates = []
    let currentDate = new Date(nextTuesday)
    
    for (let i = 0; i < 12; i++) {
      dates.push({
        dateNumber: i + 1,
        scheduledDate: currentDate.toISOString().split('T')[0]
      })
      currentDate.setDate(currentDate.getDate() + 15)
    }
    
    return dates
  }

  const [formData, setFormData] = useState<FormData>({
    tournamentNumber: 28,
    gameDates: generateInitialDates(),
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

  // Obtener número de torneo o cargar torneo existente
  useEffect(() => {
    if (user?.adminKey) {
      if (isEditing) {
        fetchTournamentData()
      } else {
        fetchNextTournamentNumber()
      }
    }
  }, [user?.adminKey, isEditing])

  const fetchNextTournamentNumber = async () => {
    if (!user?.adminKey) {
      console.log('No admin key available, skipping tournament number fetch')
      return
    }
    
    try {
      const response = await fetch('/api/tournaments/next-number', {
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTournamentNumber(data.nextNumber)
        setFormData(prev => ({
          ...prev,
          tournamentNumber: data.nextNumber
        }))
      } else {
        console.error('API response not ok:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error details:', errorData)
        // Set default tournament number if API fails
        const defaultNumber = 28
        setTournamentNumber(defaultNumber)
        setFormData(prev => ({
          ...prev,
          tournamentNumber: defaultNumber
        }))
      }
    } catch (err) {
      console.error('Error fetching tournament number:', err)
      // Set default tournament number if fetch fails
      const defaultNumber = 28
      setTournamentNumber(defaultNumber)
      setFormData(prev => ({
        ...prev,
        tournamentNumber: defaultNumber
      }))
    }
  }

  const fetchTournamentData = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const tournament = await response.json()
        setTournamentNumber(tournament.number)
        setFormData({
          tournamentNumber: tournament.number,
          gameDates: tournament.gameDates.map((date: any) => ({
            dateNumber: date.dateNumber,
            scheduledDate: date.scheduledDate.split('T')[0]
          })),
          participantIds: tournament.tournamentParticipants.map((tp: any) => tp.player.id),
          blindLevels: tournament.blindLevels
        })
      }
    } catch (err) {
      console.error('Error fetching tournament data:', err)
    }
  }

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
        
        // Seleccionar todos por defecto solo en nuevo torneo
        if (!isEditing) {
          setFormData(prev => ({
            ...prev,
            participantIds: activePlayers.map((p: Player) => p.id)
          }))
        }
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
      const validDates = formData.gameDates.filter(d => d.scheduledDate)
      if (validDates.length !== 12) {
        throw new Error('Debe programar las 12 fechas')
      }

      if (formData.participantIds.length === 0) {
        throw new Error('Debe seleccionar al menos un participante')
      }

      const submitData = {
        number: formData.tournamentNumber,
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


  // Función para generar todas las fechas automáticamente
  const generateGameDates = (firstDate: string) => {
    const dates = []
    let currentDate = new Date(firstDate)
    
    // Asegurar que la primera fecha sea martes
    currentDate = getNextTuesday(currentDate)
    
    for (let i = 0; i < 12; i++) {
      dates.push({
        dateNumber: i + 1,
        scheduledDate: currentDate.toISOString().split('T')[0]
      })
      // Siguiente fecha: 15 días después
      currentDate.setDate(currentDate.getDate() + 15)
      // Asegurar que siga siendo martes (por si cae en día no martes)
      currentDate = getNextTuesday(currentDate)
    }
    
    return dates
  }

  const updateGameDate = (index: number, scheduledDate: string) => {
    const newDates = [...formData.gameDates]
    newDates[index].scheduledDate = scheduledDate
    
    // Si se cambia la primera fecha, regenerar todas las siguientes
    if (index === 0 && scheduledDate) {
      const generatedDates = generateGameDates(scheduledDate)
      updateFormData('gameDates', generatedDates)
    } else {
      // Si se cambia cualquier otra fecha, regenerar desde esa fecha
      if (scheduledDate) {
        const updatedDates = [...newDates]
        let currentDate = new Date(scheduledDate)
        
        // Actualizar las fechas siguientes
        for (let i = index + 1; i < 12; i++) {
          currentDate.setDate(currentDate.getDate() + 15)
          currentDate = getNextTuesday(currentDate)
          updatedDates[i].scheduledDate = currentDate.toISOString().split('T')[0]
        }
        
        updateFormData('gameDates', updatedDates)
      } else {
        updateFormData('gameDates', newDates)
      }
    }
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
            {isEditing ? `Editar Torneo ${tournamentNumber}` : `Nuevo Torneo ${tournamentNumber}`}
          </h1>
        </div>

        {/* Tabs de navegación */}
        <div className="flex space-x-1 bg-poker-card rounded-lg p-1">
          <button
            onClick={() => setActiveTab('participants')}
            className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center justify-center space-x-1 sm:space-x-2 ${
              activeTab === 'participants'
                ? 'bg-poker-red text-white shadow-lg'
                : 'text-poker-muted hover:text-poker-text'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Participantes</span>
            <span className="sm:hidden">Part.</span>
          </button>
          <button
            onClick={() => setActiveTab('blinds')}
            className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center justify-center space-x-1 sm:space-x-2 ${
              activeTab === 'blinds'
                ? 'bg-poker-red text-white shadow-lg'
                : 'text-poker-muted hover:text-poker-text'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Blinds</span>
          </button>
          <button
            onClick={() => setActiveTab('dates')}
            className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center justify-center space-x-1 sm:space-x-2 ${
              activeTab === 'dates'
                ? 'bg-poker-red text-white shadow-lg'
                : 'text-poker-muted hover:text-poker-text'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Fechas</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tab: Fechas */}
          {activeTab === 'dates' && (
            <div className="space-y-6 bg-poker-card p-6 rounded-lg border border-white/10">
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center space-x-2">
                  <Label className="text-poker-text font-medium">Número:</Label>
                  <Input
                    type="number"
                    value={formData.tournamentNumber}
                    onChange={(e) => updateFormData('tournamentNumber', parseInt(e.target.value))}
                    className="w-20 bg-poker-dark/50 border-white/10 text-white focus:border-poker-red"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-poker-dark/30 p-3 rounded-lg border border-white/5">
                  <p className="text-xs text-poker-muted mb-2">
                    💡 Las fechas se generan automáticamente cada 15 días en martes. Solo configura la primera fecha.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                  {formData.gameDates.map((gameDate, index) => (
                    <div key={index} className="space-y-2 p-3 bg-poker-dark/20 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                      <Label className="text-poker-text flex items-center justify-between text-sm font-medium">
                        <span>Fecha {gameDate.dateNumber}</span>
                        {index === 0 && (
                          <span className="text-xs text-poker-cyan bg-poker-cyan/10 px-2 py-1 rounded-full">Principal</span>
                        )}
                      </Label>
                      <DatePicker
                        value={gameDate.scheduledDate}
                        onChange={(value) => updateGameDate(index, value)}
                        placeholder={index === 0 ? "Fecha inicial" : "Auto"}
                        required={index === 0}
                        className="w-full"
                      />
                      {gameDate.scheduledDate && (
                        <div className="text-xs text-poker-muted mt-1">
                          {new Date(gameDate.scheduledDate).toLocaleDateString('es-ES', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Participantes */}
          {activeTab === 'participants' && (
            <div className="space-y-4 bg-poker-card p-6 rounded-lg border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">
                Participantes ({formData.participantIds.length})
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
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Blinds */}
          {activeTab === 'blinds' && (
            <div className="space-y-4 bg-poker-card p-6 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Estructura de Blinds</h3>
                <Button
                  type="button"
                  onClick={() => {
                    const lastLevel = formData.blindLevels[formData.blindLevels.length - 1]
                    const newBlind: BlindLevel = {
                      level: lastLevel.level + 1,
                      smallBlind: lastLevel.bigBlind,
                      bigBlind: lastLevel.bigBlind * 2,
                      duration: 10
                    }
                    updateFormData('blindLevels', [...formData.blindLevels, newBlind])
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar Nivel
                </Button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-poker-text">Nivel</th>
                      <th className="text-left py-2 text-poker-text">Small Blind</th>
                      <th className="text-left py-2 text-poker-text">Big Blind</th>
                      <th className="text-left py-2 text-poker-text">Tiempo (min)</th>
                      <th className="text-right py-2 text-poker-text">Acción</th>
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
                        <td className="py-2 text-right">
                          {formData.blindLevels.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (formData.blindLevels.length <= 5) {
                                  setPendingBlindLevels(formData.blindLevels.filter((_, i) => i !== index))
                                  setShowBlindsConfirm(true)
                                } else {
                                  const newBlinds = formData.blindLevels
                                    .filter((_, i) => i !== index)
                                    .map((blind, newIndex) => ({ ...blind, level: newIndex + 1 }))
                                  updateFormData('blindLevels', newBlinds)
                                }
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
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

          {/* Botones - Solo en tab Fechas */}
          {activeTab === 'dates' && (
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/tournaments')}
                className="w-full sm:flex-1 border-white/20 text-poker-text hover:bg-white/5 text-sm py-2.5"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:flex-1 bg-poker-red hover:bg-red-700 text-white text-sm py-2.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Guardando...</span>
                    <span className="sm:hidden">Guardando</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">{isEditing ? 'Actualizar Torneo' : 'Crear Torneo'}</span>
                    <span className="sm:hidden">{isEditing ? 'Actualizar' : 'Crear'}</span>
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Botones para tabs Participantes y Blinds */}
          {(activeTab === 'participants' || activeTab === 'blinds') && (
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab('dates')}
                className="w-full sm:flex-1 border-white/20 text-poker-text hover:bg-white/5 text-xs sm:text-sm py-2"
              >
                Ir a Fechas
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setPendingFormData(formData)
                  setShowSaveConfirm(true)
                }}
                className="w-full sm:flex-1 bg-poker-red hover:bg-red-700 text-white text-xs sm:text-sm py-2"
              >
                <Save className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Guardar y Crear</span>
                <span className="sm:hidden">Crear</span>
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* Modal de confirmación para eliminar blinds */}
      {showBlindsConfirm && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-poker-card border border-white/10 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              Confirmar eliminación
            </h3>
            <p className="text-poker-muted mb-6">
              ¿Estás seguro de que quieres eliminar este nivel de blind? Esta acción afectará la estructura del torneo.
            </p>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowBlindsConfirm(false)
                  setPendingBlindLevels([])
                }}
                className="flex-1 border-white/20 text-white hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const newBlinds = pendingBlindLevels
                    .map((blind, index) => ({ ...blind, level: index + 1 }))
                  updateFormData('blindLevels', newBlinds)
                  setShowBlindsConfirm(false)
                  setPendingBlindLevels([])
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para guardar y crear */}
      {showSaveConfirm && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-poker-card border border-white/10 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              Confirmar cambios
            </h3>
            <p className="text-poker-muted mb-6">
              ¿Deseas guardar los cambios realizados y crear el torneo con esta configuración?
            </p>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowSaveConfirm(false)
                  setPendingFormData(null)
                }}
                className="flex-1 border-white/20 text-white hover:bg-white/5"
              >
                No, regresar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowSaveConfirm(false)
                  setPendingFormData(null)
                  setActiveTab('dates')
                  // El formulario ya tiene los cambios aplicados
                  // Solo navegamos a configuración para crear el torneo
                }}
                className="flex-1 bg-poker-red hover:bg-red-700 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                Sí, continuar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}