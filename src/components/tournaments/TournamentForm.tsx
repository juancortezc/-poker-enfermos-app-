'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { ValidationSummary } from '@/components/ui/ValidationMessage'
import LoadingState, { FormSkeleton } from '@/components/ui/LoadingState'
import { useFormValidation, useFormDraft } from '@/hooks/useFormDraft'
import { validateTournamentForm, validateTournamentNumber } from '@/lib/tournament-validation'
import { TOURNAMENT_PRESETS, getPresetById } from '@/lib/tournament-presets'
import { generateTournamentDates } from '@/lib/date-utils'
import { ArrowLeft, Save, Loader2, Check, AlertCircle, Target, X } from 'lucide-react'
import { toast } from 'react-toastify'
import { buildAuthHeaders, getStoredAuthToken, getAuthHeaderValue } from '@/lib/client-auth'
import { fetchCalendarDraft, clearCalendarDraft } from '@/lib/calendar-draft'

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
    id?: number
    dateNumber: number
    scheduledDate: string
  }>
  participantIds: string[]
  blindLevels: BlindLevel[]
}

// Niveles de blinds por defecto (12 niveles + pausa cena)
// NOTA: Pausa de 30min para cena después del nivel 3 (manual en timer)
const DEFAULT_BLIND_LEVELS: BlindLevel[] = [
  { level: 1, smallBlind: 50, bigBlind: 100, duration: 25 },
  { level: 2, smallBlind: 100, bigBlind: 200, duration: 25 },
  { level: 3, smallBlind: 150, bigBlind: 300, duration: 25 },
  // PAUSA PARA CENA: 30 minutos (pausar timer manualmente)
  { level: 4, smallBlind: 250, bigBlind: 500, duration: 25 },
  { level: 5, smallBlind: 400, bigBlind: 800, duration: 25 },
  { level: 6, smallBlind: 600, bigBlind: 1200, duration: 20 },
  { level: 7, smallBlind: 800, bigBlind: 1600, duration: 20 },
  { level: 8, smallBlind: 1000, bigBlind: 2000, duration: 20 },
  { level: 9, smallBlind: 1250, bigBlind: 2500, duration: 20 },
  { level: 10, smallBlind: 1500, bigBlind: 3000, duration: 20 },
  { level: 11, smallBlind: 2000, bigBlind: 4000, duration: 15 },
  { level: 12, smallBlind: 2500, bigBlind: 5000, duration: 0 } // Sin más aumentos
]

interface TournamentFormProps {
  tournamentId?: string
  initialTournamentNumber?: number
  useCalendarDraft?: boolean
}

export default function TournamentForm({ tournamentId, initialTournamentNumber, useCalendarDraft }: TournamentFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')
  const [tournamentNumber, setTournamentNumber] = useState<number>(initialTournamentNumber || 0)
  const [showBlindsConfirm, setShowBlindsConfirm] = useState(false)
  const [pendingBlindLevels, setPendingBlindLevels] = useState<BlindLevel[]>([])
  const [numberValidationError, setNumberValidationError] = useState<string>('')
  const [selectedPreset, setSelectedPreset] = useState<string>('standard')
  const [showPresetModal, setShowPresetModal] = useState(false)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  
  const isEditing = !!tournamentId
  const [activeTab, setActiveTab] = useState<'participants' | 'dates' | 'blinds'>('participants')

  // Función para generar fechas iniciales usando utilidad centralizada
  const generateInitialDates = () => {
    const today = new Date()
    const dates = generateTournamentDates(today, 12)
    
    // generateTournamentDates ya devuelve objetos con dateNumber y scheduledDate
    return dates
  }

  const [formData, setFormData] = useState<FormData>({
    tournamentNumber: initialTournamentNumber || 28,
    gameDates: generateInitialDates(),
    participantIds: [],
    blindLevels: DEFAULT_BLIND_LEVELS
  })

  // Form validation
  const { isValid, errors, warnings, isValidating, validateWithDebounce } = useFormValidation(
    formData,
    validateTournamentForm
  )

  // Form draft management
  const { clearDraft } = useFormDraft(formData, {
    key: tournamentId || 'new-tournament',
    autosaveInterval: 30000
  })

  // Verificar permisos
  useEffect(() => {
    if (user && user.role !== UserRole.Comision) {
      router.push('/tournaments')
      return
    }
  }, [user, router])

  useEffect(() => {
    if (!useCalendarDraft) return

    let cancelled = false

    const loadDraft = async () => {
      try {
        const draft = await fetchCalendarDraft()
        if (!cancelled && draft && Array.isArray(draft.gameDates) && draft.gameDates.length === 12) {
          setFormData(prev => ({
            ...prev,
            tournamentNumber: draft.tournamentNumber || initialTournamentNumber || prev.tournamentNumber,
            gameDates: draft.gameDates
          }))

          if (draft.tournamentNumber) {
            setTournamentNumber(draft.tournamentNumber)
          }
        }
      } catch (error) {
        console.error('Error loading shared calendar draft:', error)
      }
    }

    loadDraft()
    return () => {
      cancelled = true
    }
  }, [useCalendarDraft, initialTournamentNumber])


  // Define fetch functions first
  const fetchTournamentData = useCallback(async () => {
    try {
      setLoadingMessage('Cargando datos del torneo...')
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        headers: buildAuthHeaders()
      })
      if (response.ok) {
        const tournament = await response.json()
        setTournamentNumber(tournament.number)
        setFormData({
          tournamentNumber: tournament.number,
          gameDates: tournament.gameDates.map((date: { id: number; dateNumber: number; scheduledDate: string }) => ({
            id: date.id,
            dateNumber: date.dateNumber,
            scheduledDate: date.scheduledDate.split('T')[0]
          })),
          participantIds: tournament.tournamentParticipants.map((tp: { player: { id: string } }) => tp.player.id),
          blindLevels: tournament.blindLevels.length > 0 ? tournament.blindLevels : DEFAULT_BLIND_LEVELS
        })
      }
    } catch (err) {
      console.error('Error fetching tournament data:', err)
    } finally {
      setInitialLoading(false)
    }
  }, [tournamentId])

  const fetchAvailablePlayers = useCallback(async () => {
    try {
      setLoadingMessage('Cargando lista de jugadores...')
      const response = await fetch('/api/players?role=Enfermo,Comision', {
        headers: buildAuthHeaders()
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
      } else {
        console.error('Failed to fetch players:', response.status, response.statusText)
      }
    } catch (err) {
      console.error('Error fetching players:', err)
    }
  }, [isEditing])

  // Cargar jugadores disponibles (Enfermos y Comisión activos)
  useEffect(() => {
    if (user && getStoredAuthToken()) {
      fetchAvailablePlayers()
    }
  }, [user, fetchAvailablePlayers])

  // Obtener número de torneo o cargar torneo existente
  useEffect(() => {
    const fetchNextTournamentNumber = async () => {
      if (!getStoredAuthToken()) {
        console.log('No auth token available, skipping tournament number fetch')
        setInitialLoading(false)
        return
      }

      try {
        setLoadingMessage('Obteniendo número de torneo...')
        const response = await fetch('/api/tournaments/next-number', {
          headers: buildAuthHeaders()
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
          const defaultNumber = 28
          setTournamentNumber(defaultNumber)
          setFormData(prev => ({
            ...prev,
            tournamentNumber: defaultNumber
          }))
        }
      } catch (err) {
        console.error('Error fetching tournament number:', err)
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

    if (user && getStoredAuthToken()) {
      if (isEditing) {
        fetchTournamentData()
      } else {
        if (!initialTournamentNumber) {
          fetchNextTournamentNumber()
        } else {
          setTournamentNumber(initialTournamentNumber)
          setFormData(prev => ({
            ...prev,
            tournamentNumber: initialTournamentNumber
          }))
          setInitialLoading(false)
        }
      }
    }
  }, [user, isEditing, initialTournamentNumber, fetchTournamentData])

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
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify(submitData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Error al guardar torneo'

        // Log detallado del error para debugging
        console.error('❌ Error creating tournament:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          submitData: {
            number: submitData.number,
            datesCount: submitData.gameDates.length,
            participantsCount: submitData.participantIds.length,
            blindLevelsCount: submitData.blindLevels.length
          }
        })

        throw new Error(errorMessage)
      }

      setLoadingMessage('Redirigiendo...')

      // Limpiar draft al completar exitosamente
      clearDraft()
      await clearCalendarDraft()

      // Mostrar notificación de éxito
      toast.success(`Torneo ${formData.tournamentNumber} ${isEditing ? 'Actualizado' : 'Creado'}`)

      router.push('/tournaments')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      console.error('Tournament form error:', err)
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  const updateFormData = useCallback((field: keyof FormData, value: FormData[keyof FormData]) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    
    // Validate with debounce
    validateWithDebounce(newData)
  }, [formData, validateWithDebounce])

  // TODO: Re-enable tournament number validation when needed

  // Cargar preset
  const loadPreset = useCallback((presetId: string) => {
    const preset = getPresetById(presetId)
    if (preset) {
      updateFormData('blindLevels', preset.blindLevels)
      setSelectedPreset(presetId)
      setShowPresetModal(false)
    }
  }, [updateFormData])


  // Restaurar blinds con confirmación
  const handleRestoreBlinds = useCallback(() => {
    updateFormData('blindLevels', DEFAULT_BLIND_LEVELS)
    setShowRestoreConfirm(false)
  }, [updateFormData])


  // Función para generar todas las fechas automáticamente usando utilidad centralizada
  const generateGameDates = (firstDate: string) => {
    // Usar la función centralizada que maneja UTC correctamente
    const startDate = new Date(firstDate + 'T12:00:00.000Z')
    const dates = generateTournamentDates(startDate, 12)
    
    // generateTournamentDates ya devuelve objetos con dateNumber y scheduledDate
    return dates
  }

  const updateGameDate = (index: number, scheduledDate: string) => {
    // Validar que scheduledDate sea una fecha válida
    if (scheduledDate && scheduledDate.trim() !== '') {
      const testDate = new Date(scheduledDate + 'T12:00:00.000Z')
      if (isNaN(testDate.getTime())) {
        console.error('Invalid date provided to updateGameDate:', scheduledDate)
        return
      }
    }
    
    const newDates = [...formData.gameDates]
    newDates[index].scheduledDate = scheduledDate
    
    // Si se cambia la primera fecha, regenerar todas las siguientes
    if (index === 0 && scheduledDate) {
      const generatedDates = generateGameDates(scheduledDate)
      updateFormData('gameDates', generatedDates)
    } else {
      // Si se cambia cualquier otra fecha, regenerar desde esa fecha usando utilidad centralizada
      if (scheduledDate) {
        const updatedDates = [...newDates]
        const startDate = new Date(scheduledDate + 'T12:00:00.000Z')
        const remainingDatesCount = 12 - (index + 1)
        
        if (remainingDatesCount > 0) {
          const remainingDates = generateTournamentDates(startDate, remainingDatesCount + 1)
          
          // Actualizar las fechas siguientes (saltamos la primera que es la fecha actual)
          for (let i = 0; i < remainingDatesCount; i++) {
            updatedDates[index + 1 + i].scheduledDate = remainingDates[i + 1].scheduledDate
          }
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

  // TODO: Re-enable blind level updates when editing is implemented

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
    <div className="min-h-screen bg-gradient-to-br from-[#1a1208] via-[#0f0a04] to-[#0a0703] pb-safe">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/tournaments')}
            className="text-[#d7c59a] hover:text-[#f3e6c5] hover:bg-[#24160f]/40"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-[#f3e6c5]">
              {isEditing ? `Editar Torneo ${tournamentNumber}` : `Nuevo Torneo ${tournamentNumber}`}
            </h1>
          </div>
        </div>

        {/* Tabs de navegación */}
        <div className="bg-[#2a1a14]/60 rounded-lg p-1 border border-[#e0b66c]/20">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 py-3 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 min-h-[44px] ${
                activeTab === 'participants'
                  ? 'bg-[#a9441c] text-[#f3e6c5] shadow-lg'
                  : 'text-[#d7c59a] hover:text-[#f3e6c5] hover:bg-[#24160f]/40'
              }`}
            >
              <span className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Participantes</span>
                <span className="sm:hidden">Miembros</span>
              </span>
              {formData.participantIds.length > 0 && (
                <span className="text-xs bg-[#e0b66c]/30 px-1.5 py-0.5 rounded-full">
                  {formData.participantIds.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('dates')}
              className={`flex-1 py-3 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 min-h-[44px] ${
                activeTab === 'dates'
                  ? 'bg-[#a9441c] text-[#f3e6c5] shadow-lg'
                  : 'text-[#d7c59a] hover:text-[#f3e6c5] hover:bg-[#24160f]/40'
              }`}
            >
              <span className="text-xs sm:text-sm">Fechas</span>
              {formData.gameDates.filter(d => d.scheduledDate).length > 0 && (
                <span className="text-xs bg-[#e0b66c]/30 px-1.5 py-0.5 rounded-full">
                  {formData.gameDates.filter(d => d.scheduledDate).length}/12
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('blinds')}
              className={`flex-1 py-3 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 min-h-[44px] ${
                activeTab === 'blinds'
                  ? 'bg-[#a9441c] text-[#f3e6c5] shadow-lg'
                  : 'text-[#d7c59a] hover:text-[#f3e6c5] hover:bg-[#24160f]/40'
              }`}
            >
              <span className="text-xs sm:text-sm">Blinds</span>
              <span className="text-xs bg-[#e0b66c]/30 px-1.5 py-0.5 rounded-full">
                {formData.blindLevels.length}
              </span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tab: Blinds */}
          {activeTab === 'blinds' && (
            <div className="space-y-6 bg-[#2a1a14]/60 p-4 sm:p-6 rounded-lg border border-[#e0b66c]/20">
              <div className="space-y-4">
                <div className="bg-[#24160f]/50 p-3 rounded-lg border border-[#e0b66c]/10">
                  <p className="text-xs text-[#d7c59a]">
                    💡 Configura los niveles de ciegas para el torneo. Duración en minutos.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#24160f]/70 border-b-2 border-[#e0b66c]/30">
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#e0b66c]">Nivel</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#e0b66c]">Ciega Chica</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#e0b66c]">Ciega Grande</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#e0b66c]">Duración (min)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.blindLevels.map((blind, index) => (
                        <tr key={index} className="border-b border-[#e0b66c]/10 hover:bg-[#24160f]/40 transition-colors">
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-[#f3e6c5]">{blind.level}</span>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              value={blind.smallBlind}
                              onChange={(e) => {
                                const newBlinds = [...formData.blindLevels]
                                newBlinds[index] = { ...newBlinds[index], smallBlind: parseInt(e.target.value) || 0 }
                                updateFormData('blindLevels', newBlinds)
                              }}
                              className="w-full px-3 py-2 bg-[#24160f] border border-[#e0b66c]/20 rounded-lg text-sm text-[#f3e6c5] focus:border-[#e0b66c] focus:ring-1 focus:ring-[#e0b66c]"
                              min="0"
                              step="25"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              value={blind.bigBlind}
                              onChange={(e) => {
                                const newBlinds = [...formData.blindLevels]
                                newBlinds[index] = { ...newBlinds[index], bigBlind: parseInt(e.target.value) || 0 }
                                updateFormData('blindLevels', newBlinds)
                              }}
                              className="w-full px-3 py-2 bg-[#24160f] border border-[#e0b66c]/20 rounded-lg text-sm text-[#f3e6c5] focus:border-[#e0b66c] focus:ring-1 focus:ring-[#e0b66c]"
                              min="0"
                              step="50"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              value={blind.duration}
                              onChange={(e) => {
                                const newBlinds = [...formData.blindLevels]
                                newBlinds[index] = { ...newBlinds[index], duration: parseInt(e.target.value) || 0 }
                                updateFormData('blindLevels', newBlinds)
                              }}
                              className="w-full px-3 py-2 bg-[#24160f] border border-[#e0b66c]/20 rounded-lg text-sm text-[#f3e6c5] focus:border-[#e0b66c] focus:ring-1 focus:ring-[#e0b66c]"
                              min="1"
                              step="5"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Fechas */}
          {activeTab === 'dates' && (
            <div className="space-y-6 bg-[#2a1a14]/60 p-4 sm:p-6 rounded-lg border border-[#e0b66c]/20">

              <div className="space-y-4 max-w-full">
                <div className="bg-[#24160f]/50 p-3 rounded-lg border border-[#e0b66c]/10">
                  <p className="text-xs text-[#d7c59a] mb-2">
                    💡 Las fechas se generan automáticamente cada 15 días en martes. Solo configura la primera fecha.
                  </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {formData.gameDates.map((gameDate, index) => (
                    <div key={index} className="bg-[#24160f] border-2 border-[#a9441c]/40 rounded-xl p-4 hover:border-[#e0b66c]/60 transition-all duration-200 hover:shadow-lg hover:shadow-[#e0b66c]/10">
                      <div className="text-center space-y-3">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-xs text-[#d7c59a] font-medium">Fecha {gameDate.dateNumber}</span>
                          {index === 0 && (
                            <div className="w-2 h-2 bg-[#e0b66c] rounded-full"></div>
                          )}
                        </div>

                        {/* Fecha prominente */}
                        {(() => {
                          if (!gameDate.scheduledDate) {
                            return (
                              <div className="space-y-1">
                                <div className="text-2xl sm:text-3xl font-bold text-[#d7c59a]">--</div>
                                <div className="text-lg sm:text-xl font-semibold text-[#d7c59a]">---</div>
                              </div>
                            )
                          }

                          const dateObj = new Date(gameDate.scheduledDate + 'T12:00:00')
                          if (isNaN(dateObj.getTime())) {
                            return (
                              <div className="space-y-1">
                                <div className="text-2xl sm:text-3xl font-bold text-red-400">!</div>
                                <div className="text-lg sm:text-xl font-semibold text-red-400">ERROR</div>
                              </div>
                            )
                          }

                          return (
                            <div className="space-y-1">
                              <div className="text-2xl sm:text-3xl font-bold text-[#f3e6c5]">
                                {dateObj.getDate()}
                              </div>
                              <div className="text-lg sm:text-xl font-semibold text-[#e0b66c]">
                                {dateObj.toLocaleDateString('es-ES', {
                                  month: 'short'
                                }).toUpperCase()}
                              </div>
                            </div>
                          )
                        })()}
                        
                        {/* Selector de fecha (menos prominente) */}
                        <div className="mt-3">
                          <DatePicker
                            value={gameDate.scheduledDate}
                            onChange={(value) => updateGameDate(index, value)}
                            placeholder={index === 0 ? "Seleccionar fecha" : "Auto"}
                            required={index === 0}
                            className="w-full text-sm opacity-80 hover:opacity-100 transition-opacity"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Participantes */}
          {activeTab === 'participants' && (
            <div className="space-y-4 bg-[#2a1a14]/60 p-6 rounded-lg border border-[#e0b66c]/20">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[#f3e6c5]">
                  Participantes ({formData.participantIds.length})
                </h3>
                <p className="text-xs text-[#d7c59a]">
                  Jugadores disponibles: {availablePlayers.length}
                </p>
              </div>

              {/* Debug info */}
              {availablePlayers.length === 0 && (
                <div className="text-center py-4 text-[#d7c59a]">
                  Cargando participantes...
                </div>
              )}

              {/* Listado estilo Excel - 3 columnas */}
              {availablePlayers.length > 0 && (
                <div className="max-h-96 overflow-y-auto border border-[#e0b66c]/20 rounded-lg">
                  <div className="grid grid-cols-3 gap-0 divide-x divide-[#e0b66c]/10">
                    {availablePlayers.map((player) => (
                    <label
                      key={player.id}
                      className={`flex flex-col p-2 sm:p-3 cursor-pointer transition-all border-b border-[#e0b66c]/10 hover:bg-[#24160f]/50 min-h-[50px] border-l-2 ${
                        formData.participantIds.includes(player.id)
                          ? 'border-l-[#e0b66c] bg-[#24160f] text-[#f3e6c5]'
                          : 'border-l-[#d7c59a]/30 bg-[#2a1a14] text-[#d7c59a] hover:text-[#f3e6c5]'
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
                        <span className="text-xs text-[#e0b66c] truncate ml-5">
                          {player.aliases[0]}
                        </span>
                      )}
                    </label>
                  ))}
                    {/* Rellenar celdas vacías para completar la grilla */}
                    {Array.from({ length: (3 - (availablePlayers.length % 3)) % 3 }).map((_, i) => (
                      <div key={`empty-${i}`} className="p-2 sm:p-3 min-h-[50px] bg-[#2a1a14] border-b border-[#e0b66c]/10 border-l-2 border-l-[#d7c59a]/30" />
                    ))}
                  </div>
                </div>
              )}
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
                onClick={activeTab === 'dates' ? () => {
                  const resetDates = generateInitialDates()
                  updateFormData('gameDates', resetDates)
                } : () => router.push('/tournaments')}
                className="w-full sm:flex-1 border-[#e0b66c]/30 text-[#d7c59a] hover:bg-[#24160f]/40 hover:text-[#f3e6c5] text-sm py-2.5"
                disabled={loading}
              >
                {activeTab === 'dates' ? 'Reset' : 'Cancelar'}
              </Button>
              <Button
                type="submit"
                disabled={loading || !isValid || isValidating || !!numberValidationError}
                className={`w-full sm:flex-1 text-sm py-2.5 transition-all ${
                  !isValid || !!numberValidationError
                    ? 'bg-gray-600 hover:bg-gray-700 text-gray-300 cursor-not-allowed'
                    : 'bg-[#a9441c] hover:bg-[#8d3717] text-[#f3e6c5]'
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
                    <span className="hidden sm:inline">{isEditing ? 'Actualizar Torneo' : activeTab === 'dates' ? 'Crear Torneo' : 'Guardar y Continuar'}</span>
                    <span className="sm:hidden">{isEditing ? 'Actualizar' : activeTab === 'dates' ? 'Crear' : 'Guardar'}</span>
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Botones para tab Participantes */}
          {activeTab === 'participants' && (
            <div className="flex justify-center">
              <Button
                type="button"
                onClick={() => setActiveTab('dates')}
                className="px-6 bg-[#a9441c] hover:bg-[#8d3717] text-[#f3e6c5] text-sm py-2"
              >
                <Save className="w-4 h-4 mr-2" />
                Continuar a Fechas
              </Button>
            </div>
          )}

          {/* Botones para tab Blinds */}
          {activeTab === 'blinds' && (
            <div className="flex justify-center">
              <Button
                type="submit"
                disabled={loading || !isValid}
                className="px-6 bg-[#a9441c] hover:bg-[#8d3717] text-[#f3e6c5] text-sm py-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditing ? 'Actualizar Blinds' : 'Guardar Blinds'}
                  </>
                )}
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

      {/* Modal de confirmación para restaurar blinds */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-poker-card border border-white/10 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              Restaurar Blinds
            </h3>
            <p className="text-poker-muted mb-6">
              ¿Seguro que deseas restaurar los blinds a la configuración por defecto? Se perderán todos los cambios realizados.
            </p>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRestoreConfirm(false)}
                className="flex-1 border-white/20 text-white hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleRestoreBlinds}
                className="flex-1 bg-poker-red hover:bg-red-700 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
