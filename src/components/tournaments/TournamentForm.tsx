'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { ValidationSummary, FieldValidation } from '@/components/ui/ValidationMessage'
import LoadingState, { FormSkeleton } from '@/components/ui/LoadingState'
import { useFormDraft, useFormValidation } from '@/hooks/useFormDraft'
import { validateTournamentForm, validateTournamentNumber } from '@/lib/tournament-validation'
import { TOURNAMENT_PRESETS, getPresetById } from '@/lib/tournament-presets'
import { ArrowLeft, Save, Loader2, Calendar, Users, Clock, Plus, X, Check, AlertCircle, Target, Cloud, CloudOff } from 'lucide-react'

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
  { level: 8, smallBlind: 600, bigBlind: 1200, duration: 16 },
  { level: 9, smallBlind: 800, bigBlind: 1600, duration: 16 },
  { level: 10, smallBlind: 1000, bigBlind: 2000, duration: 16 },
  { level: 11, smallBlind: 1500, bigBlind: 3000, duration: 16 },
  { level: 12, smallBlind: 2000, bigBlind: 4000, duration: 10 },
  { level: 13, smallBlind: 3000, bigBlind: 6000, duration: 10 },
  { level: 14, smallBlind: 4000, bigBlind: 8000, duration: 10 },
  { level: 15, smallBlind: 5000, bigBlind: 10000, duration: 10 },
  { level: 16, smallBlind: 6000, bigBlind: 12000, duration: 10 },
  { level: 17, smallBlind: 8000, bigBlind: 16000, duration: 10 },
  { level: 18, smallBlind: 10000, bigBlind: 20000, duration: 0 }
]

export default function TournamentForm({ tournamentId }: { tournamentId?: string }) {
  const { user } = useAuth()
  const router = useRouter()
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')
  const [tournamentNumber, setTournamentNumber] = useState<number>(0)
  const [showBlindsConfirm, setShowBlindsConfirm] = useState(false)
  const [pendingBlindLevels, setPendingBlindLevels] = useState<BlindLevel[]>([])
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)
  const [numberValidationError, setNumberValidationError] = useState<string>('')
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string>('standard')
  const [showPresetModal, setShowPresetModal] = useState(false)
  
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
    const currentDate = new Date(nextTuesday)
    
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

  // Form draft y validation
  const draftKey = isEditing ? `edit-${tournamentId}` : 'new-tournament'
  const { saveDraft, loadDraft, clearDraft, hasDraft, lastSaved, isAutoSaving } = useFormDraft(
    formData,
    {
      key: draftKey,
      autosaveInterval: 30000,
      onSave: (data) => console.log('Draft saved:', data),
      onRestore: (data) => console.log('Draft restored:', data)
    }
  )

  const { isValid, errors, warnings, isValidating, validateWithDebounce } = useFormValidation(
    formData,
    validateTournamentForm
  )

  // Verificar permisos
  useEffect(() => {
    if (user && user.role !== UserRole.Comision) {
      router.push('/tournaments')
      return
    }
  }, [user, router])

  // Verificar draft al montar componente
  useEffect(() => {
    if (hasDraft && !isEditing) {
      setShowDraftModal(true)
    }
  }, [hasDraft, isEditing])

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
      setInitialLoading(false)
      return
    }
    
    try {
      setLoadingMessage('Obteniendo número de torneo...')
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
    } finally {
      setInitialLoading(false)
    }
  }

  const fetchTournamentData = async () => {
    try {
      setLoadingMessage('Cargando datos del torneo...')
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
          gameDates: tournament.gameDates.map((date: { dateNumber: number; scheduledDate: string }) => ({
            dateNumber: date.dateNumber,
            scheduledDate: date.scheduledDate.split('T')[0]
          })),
          participantIds: tournament.tournamentParticipants.map((tp: { player: { id: string } }) => tp.player.id),
          blindLevels: tournament.blindLevels
        })
      }
    } catch (err) {
      console.error('Error fetching tournament data:', err)
    } finally {
      setInitialLoading(false)
    }
  }

  const fetchAvailablePlayers = async () => {
    try {
      setLoadingMessage('Cargando lista de jugadores...')
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
      setLoadingMessage('Validando configuración...')
      
      // Validaciones
      const validDates = formData.gameDates.filter(d => d.scheduledDate)
      if (validDates.length !== 12) {
        throw new Error('Debe programar las 12 fechas')
      }

      if (formData.participantIds.length === 0) {
        setError('Debe seleccionar al menos un participante')
        return
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

      setLoadingMessage(isEditing ? 'Actualizando torneo...' : 'Creando torneo...')

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

      setLoadingMessage('Redirigiendo...')
      
      // Limpiar draft al completar exitosamente
      clearDraft()
      
      router.push('/tournaments')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateFormData = useCallback((field: keyof FormData, value: any) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    
    // Auto-save draft
    saveDraft(newData)
    
    // Validate with debounce
    validateWithDebounce(newData)
  }, [formData, saveDraft, validateWithDebounce])

  // Validación de número de torneo
  const validateTournamentNumberDebounced = useCallback(async (number: number) => {
    if (!user?.adminKey) return
    
    try {
      const error = await validateTournamentNumber(number, isEditing ? tournamentId : undefined, user.adminKey)
      setNumberValidationError(error?.message || '')
    } catch (err) {
      console.error('Error validating tournament number:', err)
    }
  }, [user?.adminKey, isEditing, tournamentId])

  // Cargar preset
  const loadPreset = useCallback((presetId: string) => {
    const preset = getPresetById(presetId)
    if (preset) {
      updateFormData('blindLevels', preset.blindLevels)
      setSelectedPreset(presetId)
      setShowPresetModal(false)
    }
  }, [updateFormData])

  // Restaurar draft
  const restoreDraft = useCallback(() => {
    const draft = loadDraft()
    if (draft) {
      setFormData(draft)
      setShowDraftModal(false)
    }
  }, [loadDraft])

  // Descartar draft
  const discardDraft = useCallback(() => {
    clearDraft()
    setShowDraftModal(false)
  }, [clearDraft])


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

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-poker-dark pb-safe">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <LoadingState 
            message={loadingMessage || 'Inicializando formulario...'} 
            size="md" 
            className="mb-6"
          />
          <FormSkeleton />
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
            onClick={() => router.push('/tournaments')}
            className="text-poker-muted hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-white">
              {isEditing ? `Editar Torneo ${tournamentNumber}` : `Nuevo Torneo ${tournamentNumber}`}
            </h1>
            {/* Indicador de auto-guardado */}
            <div className="flex items-center space-x-2 text-xs text-poker-muted">
              {isAutoSaving ? (
                <>
                  <Cloud className="w-3 h-3 animate-pulse" />
                  <span>Guardando...</span>
                </>
              ) : hasDraft && lastSaved ? (
                <>
                  <CloudOff className="w-3 h-3 text-poker-cyan" />
                  <span>Guardado {new Date(lastSaved).toLocaleTimeString()}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Tabs de navegación */}
        <div className="bg-poker-card rounded-lg p-1">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 py-3 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 min-h-[44px] ${
                activeTab === 'participants'
                  ? 'bg-poker-red text-white shadow-lg'
                  : 'text-poker-muted hover:text-poker-text hover:bg-white/5'
              }`}
            >
              <Users className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Participantes</span>
                <span className="sm:hidden">Miembros</span>
              </span>
              {formData.participantIds.length > 0 && (
                <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                  {formData.participantIds.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('blinds')}
              className={`flex-1 py-3 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 min-h-[44px] ${
                activeTab === 'blinds'
                  ? 'bg-poker-red text-white shadow-lg'
                  : 'text-poker-muted hover:text-poker-text hover:bg-white/5'
              }`}
            >
              <Clock className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Blinds</span>
              {formData.blindLevels.length > 0 && (
                <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                  {formData.blindLevels.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('dates')}
              className={`flex-1 py-3 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 min-h-[44px] ${
                activeTab === 'dates'
                  ? 'bg-poker-red text-white shadow-lg'
                  : 'text-poker-muted hover:text-poker-text hover:bg-white/5'
              }`}
            >
              <Calendar className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Fechas</span>
              {formData.gameDates.filter(d => d.scheduledDate).length > 0 && (
                <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                  {formData.gameDates.filter(d => d.scheduledDate).length}/12
                </span>
              )}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tab: Fechas */}
          {activeTab === 'dates' && (
            <div className="space-y-6 bg-poker-card p-6 rounded-lg border border-white/10">
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center space-x-2">
                  <Label className="text-poker-text font-medium">Número:</Label>
                  <div className="space-y-1">
                    <Input
                      type="number"
                      value={formData.tournamentNumber}
                      onChange={(e) => {
                        const value = parseInt(e.target.value)
                        updateFormData('tournamentNumber', value)
                        validateTournamentNumberDebounced(value)
                      }}
                      className={`w-20 bg-poker-dark/50 border-white/10 text-white focus:border-poker-red ${
                        numberValidationError ? 'border-red-500/50' : ''
                      }`}
                      min="1"
                      max="999"
                      required
                    />
                    {numberValidationError && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {numberValidationError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-poker-dark/30 p-3 rounded-lg border border-white/5">
                  <p className="text-xs text-poker-muted mb-2">
                    💡 Las fechas se generan automáticamente cada 15 días en martes. Solo configura la primera fecha.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
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
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Participantes ({formData.participantIds.length})
                </h3>
              </div>
              
              {/* Listado estilo Excel - 3 columnas */}
              <div className="max-h-96 overflow-y-auto border border-white/10 rounded-lg">
                <div className="grid grid-cols-3 gap-0 divide-x divide-white/5">
                  {availablePlayers.map((player) => (
                    <label
                      key={player.id}
                      className={`flex flex-col p-2 sm:p-3 cursor-pointer transition-all border-b border-white/5 hover:bg-poker-dark/30 min-h-[50px] border-l-2 ${
                        formData.participantIds.includes(player.id)
                          ? 'border-l-red-500 bg-poker-card text-white'
                          : 'border-l-gray-600 bg-poker-card text-poker-text hover:text-white'
                      }`}
                    >
                      <div className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          checked={formData.participantIds.includes(player.id)}
                          onChange={() => toggleParticipant(player.id)}
                          className="rounded border-gray-500 text-gray-600 focus:ring-gray-500 focus:ring-1 w-3 h-3 mr-2 flex-shrink-0 accent-gray-600"
                        />
                        <span className="text-sm truncate flex-1 font-medium">
                          {player.firstName}
                        </span>
                      </div>
                      {/* Mostrar primer alias si existe */}
                      {player.aliases && player.aliases.length > 0 && (
                        <span className="text-xs text-poker-muted truncate ml-5">
                          {player.aliases[0]}
                        </span>
                      )}
                    </label>
                  ))}
                  {/* Rellenar celdas vacías para completar la grilla */}
                  {Array.from({ length: (3 - (availablePlayers.length % 3)) % 3 }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-2 sm:p-3 min-h-[50px] bg-poker-card border-b border-white/5 border-l-2 border-l-gray-600" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Blinds */}
          {activeTab === 'blinds' && (
            <div className="space-y-6 bg-poker-card p-6 rounded-lg border border-white/10">
              {/* Selector de Presets */}
              <div className="bg-poker-dark/30 p-4 rounded-lg border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-white">Presets de Blinds</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPresetModal(true)}
                    className="text-xs border-white/20 text-poker-text hover:bg-white/5"
                  >
                    Ver todos
                  </Button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {TOURNAMENT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => loadPreset(preset.id)}
                      className={`p-2 rounded-md text-xs border transition-all text-left ${
                        selectedPreset === preset.id
                          ? 'bg-poker-red/20 border-poker-red text-white'
                          : 'bg-poker-dark/50 border-white/10 text-poker-muted hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span>{preset.icon}</span>
                        <span className="font-medium">{preset.name}</span>
                      </div>
                      <div className="text-xs opacity-80">{preset.estimatedDuration}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Estructura de Blinds</h3>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => updateFormData('blindLevels', DEFAULT_BLIND_LEVELS)}
                    className="text-xs border-white/20 text-poker-text hover:bg-white/5"
                  >
                    Restaurar
                  </Button>
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
              </div>

              {/* Validación de blinds */}
              <FieldValidation errors={[...errors, ...warnings]} field="blindLevels" />
              
              {/* Vista desktop: tabla */}
              <div className="hidden sm:block overflow-x-auto">
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
                    {formData.blindLevels.map((blind, index) => {
                      const fieldErrors = [...errors, ...warnings].filter(e => 
                        e.field.startsWith(`blindLevel-${index}`) || e.field === 'blindLevels'
                      )
                      const hasError = fieldErrors.some(e => e.type === 'error')
                      
                      return (
                        <tr key={blind.level} className={`border-b border-white/5 ${
                          hasError ? 'bg-red-500/5' : ''
                        }`}>
                          <td className="py-2 text-white font-medium">{blind.level}</td>
                          <td className="py-2">
                            <Input
                              type="number"
                              value={blind.smallBlind}
                              onChange={(e) => updateBlindLevel(index, 'smallBlind', parseInt(e.target.value))}
                              className={`w-20 bg-poker-dark/50 border-white/10 text-white focus:border-poker-red text-sm ${
                                fieldErrors.some(e => e.field.includes('smallBlind')) ? 'border-red-500/50' : ''
                              }`}
                            />
                          </td>
                          <td className="py-2">
                            <Input
                              type="number"
                              value={blind.bigBlind}
                              onChange={(e) => updateBlindLevel(index, 'bigBlind', parseInt(e.target.value))}
                              className={`w-20 bg-poker-dark/50 border-white/10 text-white focus:border-poker-red text-sm ${
                                fieldErrors.some(e => e.field.includes('bigBlind')) ? 'border-red-500/50' : ''
                              }`}
                            />
                          </td>
                          <td className="py-2">
                            {blind.duration === 0 ? (
                              <span className="text-sm text-poker-cyan font-medium">Sin límite</span>
                            ) : (
                              <Input
                                type="number"
                                value={blind.duration}
                                onChange={(e) => updateBlindLevel(index, 'duration', parseInt(e.target.value))}
                                className={`w-16 bg-poker-dark/50 border-white/10 text-white focus:border-poker-red text-sm ${
                                  fieldErrors.some(e => e.field.includes('duration')) ? 'border-red-500/50' : ''
                                }`}
                              />
                            )}
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
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vista móvil: cards */}
              <div className="sm:hidden space-y-3 max-h-96 overflow-y-auto">
                {formData.blindLevels.map((blind, index) => {
                  const fieldErrors = [...errors, ...warnings].filter(e => 
                    e.field.startsWith(`blindLevel-${index}`) || e.field === 'blindLevels'
                  )
                  const hasError = fieldErrors.some(e => e.type === 'error')
                  
                  return (
                    <div key={blind.level} className={`p-4 bg-poker-dark/30 rounded-lg border ${
                      hasError ? 'border-red-500/50' : 'border-white/10'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-white font-medium">Nivel {blind.level}</h4>
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
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-poker-muted mb-1 block">Small Blind</Label>
                          <Input
                            type="number"
                            value={blind.smallBlind}
                            onChange={(e) => updateBlindLevel(index, 'smallBlind', parseInt(e.target.value))}
                            className={`bg-poker-dark/50 border-white/10 text-white focus:border-poker-red ${
                              fieldErrors.some(e => e.field.includes('smallBlind')) ? 'border-red-500/50' : ''
                            }`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-poker-muted mb-1 block">Big Blind</Label>
                          <Input
                            type="number"
                            value={blind.bigBlind}
                            onChange={(e) => updateBlindLevel(index, 'bigBlind', parseInt(e.target.value))}
                            className={`bg-poker-dark/50 border-white/10 text-white focus:border-poker-red ${
                              fieldErrors.some(e => e.field.includes('bigBlind')) ? 'border-red-500/50' : ''
                            }`}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs text-poker-muted mb-1 block">Tiempo (minutos)</Label>
                          {blind.duration === 0 ? (
                            <div className="bg-poker-dark/50 border border-white/10 rounded-md px-3 py-2 text-poker-cyan font-medium">
                              Sin límite
                            </div>
                          ) : (
                            <Input
                              type="number"
                              value={blind.duration}
                              onChange={(e) => updateBlindLevel(index, 'duration', parseInt(e.target.value))}
                              className={`bg-poker-dark/50 border-white/10 text-white focus:border-poker-red ${
                                fieldErrors.some(e => e.field.includes('duration')) ? 'border-red-500/50' : ''
                              }`}
                            />
                          )}
                        </div>
                      </div>
                      {fieldErrors.length > 0 && (
                        <div className="mt-2">
                          <FieldValidation errors={fieldErrors} field={`blindLevel-${index}`} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Resumen de validación */}
          <ValidationSummary 
            errors={errors} 
            warnings={warnings}
            className="animate-in slide-in-from-top-2 duration-300" 
          />

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
                disabled={loading || !isValid || isValidating || !!numberValidationError}
                className={`w-full sm:flex-1 text-sm py-2.5 transition-all ${
                  !isValid || !!numberValidationError
                    ? 'bg-gray-600 hover:bg-gray-700 text-gray-300 cursor-not-allowed'
                    : 'bg-poker-red hover:bg-red-700 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">{loadingMessage || 'Guardando...'}</span>
                    <span className="sm:hidden">{loadingMessage ? loadingMessage.split(' ')[0] + '...' : 'Guardando'}</span>
                  </>
                ) : isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Validando...</span>
                    <span className="sm:hidden">Validando</span>
                  </>
                ) : !isValid ? (
                  <>
                    <AlertCircle className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Corregir errores</span>
                    <span className="sm:hidden">Errores</span>
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

      {/* Modal para restaurar draft */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-poker-card border border-white/10 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <Cloud className="w-5 h-5 mr-2 text-poker-cyan" />
              Borrador encontrado
            </h3>
            <p className="text-poker-muted mb-4">
              Se encontró un borrador guardado automáticamente. ¿Deseas continuar desde donde te quedaste?
            </p>
            {lastSaved && (
              <p className="text-xs text-poker-cyan mb-6">
                Guardado el {lastSaved.toLocaleString()}
              </p>
            )}
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={discardDraft}
                className="flex-1 border-white/20 text-white hover:bg-white/5"
              >
                Descartar
              </Button>
              <Button
                type="button"
                onClick={restoreDraft}
                className="flex-1 bg-poker-cyan hover:bg-cyan-600 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                Continuar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de presets detallado */}
      {showPresetModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-poker-card border border-white/10 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Presets de Torneos
              </h3>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowPresetModal(false)}
                className="text-poker-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid gap-4">
              {TOURNAMENT_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedPreset === preset.id
                      ? 'bg-poker-red/20 border-poker-red'
                      : 'bg-poker-dark/30 border-white/10 hover:border-white/20'
                  }`}
                  onClick={() => {
                    loadPreset(preset.id)
                    setShowPresetModal(false)
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{preset.icon}</span>
                      <h4 className="text-lg font-semibold text-white">{preset.name}</h4>
                    </div>
                    <div className="text-xs text-poker-cyan bg-poker-cyan/10 px-2 py-1 rounded-full">
                      {preset.estimatedDuration}
                    </div>
                  </div>
                  <p className="text-poker-muted text-sm mb-3">{preset.description}</p>
                  <div className="text-xs text-poker-text">
                    {preset.blindLevels.length} niveles • 
                    {preset.blindLevels[0].smallBlind}/{preset.blindLevels[0].bigBlind} → 
                    {preset.blindLevels[preset.blindLevels.length - 2].smallBlind}/{preset.blindLevels[preset.blindLevels.length - 2].bigBlind}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}