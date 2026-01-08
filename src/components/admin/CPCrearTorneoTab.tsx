'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertCircle, Check, Calendar, Users, Settings, ChevronDown } from 'lucide-react'
import { buildAuthHeaders, getStoredAuthToken } from '@/lib/client-auth'
import { generateTournamentDates } from '@/lib/date-utils'
import { fetchCalendarDraft, saveCalendarDraft, clearCalendarDraft } from '@/lib/calendar-draft'
import { toast } from 'react-toastify'
import { UserRole } from '@prisma/client'

interface GeneratedDate {
  dateNumber: number
  scheduledDate: string
}

interface Player {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
}

interface BlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
  duration: number
}

// Default blind levels
const DEFAULT_BLIND_LEVELS: BlindLevel[] = [
  { level: 1, smallBlind: 50, bigBlind: 100, duration: 25 },
  { level: 2, smallBlind: 100, bigBlind: 200, duration: 25 },
  { level: 3, smallBlind: 150, bigBlind: 300, duration: 25 },
  { level: 4, smallBlind: 250, bigBlind: 500, duration: 25 },
  { level: 5, smallBlind: 400, bigBlind: 800, duration: 25 },
  { level: 6, smallBlind: 600, bigBlind: 1200, duration: 20 },
  { level: 7, smallBlind: 800, bigBlind: 1600, duration: 20 },
  { level: 8, smallBlind: 1000, bigBlind: 2000, duration: 20 },
  { level: 9, smallBlind: 1250, bigBlind: 2500, duration: 20 },
  { level: 10, smallBlind: 1500, bigBlind: 3000, duration: 20 },
  { level: 11, smallBlind: 2000, bigBlind: 4000, duration: 15 },
  { level: 12, smallBlind: 2500, bigBlind: 5000, duration: 0 }
]

type Step = 'calendario' | 'participantes' | 'configuracion'

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'calendario', label: 'Calendario', icon: <Calendar size={16} /> },
  { id: 'participantes', label: 'Participantes', icon: <Users size={16} /> },
  { id: 'configuracion', label: 'Config', icon: <Settings size={16} /> },
]

export default function CPCrearTorneoTab() {
  // State
  const [currentStep, setCurrentStep] = useState<Step>('calendario')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Calendar state
  const [gameDates, setGameDates] = useState<GeneratedDate[]>([])
  const [calendarApproved, setCalendarApproved] = useState(false)

  // Tournament state
  const [nextTournamentNumber, setNextTournamentNumber] = useState<number>(0)
  const [tournamentNumber, setTournamentNumber] = useState<number>(0)

  // Participants state
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])

  // Config state
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>(DEFAULT_BLIND_LEVELS)

  // Generate initial dates
  const generateInitialDates = useCallback(() => {
    const today = new Date()
    return generateTournamentDates(today, 12)
  }, [])

  // Load initial data
  useEffect(() => {
    const initialize = async () => {
      if (!getStoredAuthToken()) {
        setLoading(false)
        return
      }

      try {
        // Fetch next tournament number
        const numberRes = await fetch('/api/tournaments/next-number', {
          headers: buildAuthHeaders()
        })
        if (numberRes.ok) {
          const data = await numberRes.json()
          setNextTournamentNumber(data.nextNumber)
          setTournamentNumber(data.nextNumber)
        }

        // Fetch players
        const playersRes = await fetch('/api/players?role=Enfermo,Comision', {
          headers: buildAuthHeaders()
        })
        if (playersRes.ok) {
          const players = await playersRes.json()
          const activePlayers = players.filter((p: Player) => p.isActive)
          setAvailablePlayers(activePlayers)
          setSelectedParticipants(activePlayers.map((p: Player) => p.id))
        }

        // Try to load saved draft
        const draft = await fetchCalendarDraft()
        if (draft?.gameDates?.length === 12) {
          setGameDates(draft.gameDates)
          if (draft.tournamentNumber) {
            setTournamentNumber(draft.tournamentNumber)
          }
          // Check if draft was approved
          if (draft.approved) {
            setCalendarApproved(true)
          }
        } else {
          setGameDates(generateInitialDates())
        }
      } catch (err) {
        console.error('Error initializing:', err)
        setGameDates(generateInitialDates())
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [generateInitialDates])

  // Update a game date
  const updateGameDate = useCallback((index: number, scheduledDate: string) => {
    if (!scheduledDate) return

    const testDate = new Date(scheduledDate + 'T12:00:00.000Z')
    if (isNaN(testDate.getTime())) return

    if (index === 0) {
      // Regenerate all dates from first date
      const newDates = generateTournamentDates(testDate, 12)
      setGameDates(newDates)
    } else {
      // Update this date and regenerate following dates
      const newDates = [...gameDates]
      newDates[index].scheduledDate = scheduledDate

      const remainingCount = 12 - (index + 1)
      if (remainingCount > 0) {
        const regenerated = generateTournamentDates(testDate, remainingCount + 1)
        for (let i = 0; i < remainingCount; i++) {
          newDates[index + 1 + i].scheduledDate = regenerated[i + 1].scheduledDate
        }
      }
      setGameDates(newDates)
    }

    // Reset approval when calendar changes
    setCalendarApproved(false)
  }, [gameDates])

  // Save calendar draft
  const saveCalendar = useCallback(async () => {
    setSaving(true)
    try {
      await saveCalendarDraft({
        tournamentNumber,
        gameDates,
        approved: false
      })
      toast.success('Calendario guardado')
    } catch (err) {
      console.error('Error saving calendar:', err)
      toast.error('Error al guardar calendario')
    } finally {
      setSaving(false)
    }
  }, [tournamentNumber, gameDates])

  // Approve calendar
  const approveCalendar = useCallback(async () => {
    const validDates = gameDates.filter(d => d.scheduledDate)
    if (validDates.length !== 12) {
      toast.error('Define las 12 fechas antes de aprobar')
      return
    }

    setSaving(true)
    try {
      await saveCalendarDraft({
        tournamentNumber,
        gameDates,
        approved: true
      })
      setCalendarApproved(true)
      toast.success('Calendario aprobado')
      setCurrentStep('participantes')
    } catch (err) {
      console.error('Error approving calendar:', err)
      toast.error('Error al aprobar calendario')
    } finally {
      setSaving(false)
    }
  }, [tournamentNumber, gameDates])

  // Toggle participant
  const toggleParticipant = useCallback((playerId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
  }, [])

  // Create tournament
  const createTournament = useCallback(async () => {
    if (!calendarApproved) {
      toast.error('Primero debes aprobar el calendario')
      return
    }
    if (selectedParticipants.length === 0) {
      toast.error('Selecciona al menos un participante')
      return
    }

    setCreating(true)
    setError('')

    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({
          number: tournamentNumber,
          gameDates: gameDates.map(d => ({
            dateNumber: d.dateNumber,
            scheduledDate: d.scheduledDate
          })),
          participantIds: selectedParticipants,
          blindLevels
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear torneo')
      }

      // Clear draft after successful creation
      await clearCalendarDraft()

      toast.success(`Torneo ${tournamentNumber} creado exitosamente`)

      // Reset form
      setCalendarApproved(false)
      setGameDates(generateInitialDates())
      setCurrentStep('calendario')

      // Fetch new tournament number
      const numberRes = await fetch('/api/tournaments/next-number', {
        headers: buildAuthHeaders()
      })
      if (numberRes.ok) {
        const data = await numberRes.json()
        setNextTournamentNumber(data.nextNumber)
        setTournamentNumber(data.nextNumber)
      }
    } catch (err) {
      console.error('Error creating tournament:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      toast.error(err instanceof Error ? err.message : 'Error al crear torneo')
    } finally {
      setCreating(false)
    }
  }, [calendarApproved, selectedParticipants, tournamentNumber, gameDates, blindLevels, generateInitialDates])

  // Check if can proceed to next step
  const canProceed = (step: Step): boolean => {
    switch (step) {
      case 'calendario':
        return calendarApproved
      case 'participantes':
        return calendarApproved && selectedParticipants.length > 0
      case 'configuracion':
        return calendarApproved && selectedParticipants.length > 0
      default:
        return false
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{
              borderColor: 'var(--cp-surface-border)',
              borderTopColor: '#E53935'
            }}
          />
          <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
            Cargando...
          </p>
        </div>
      </div>
    )
  }

  const validDatesCount = gameDates.filter(d => d.scheduledDate).length

  return (
    <div className="space-y-4">
      {/* Tournament Number Header */}
      <div
        className="flex items-center justify-between p-3"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
          borderRadius: '4px',
        }}
      >
        <div>
          <p style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}>
            Nuevo Torneo
          </p>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              value={tournamentNumber}
              onChange={(e) => setTournamentNumber(parseInt(e.target.value) || 0)}
              className="w-20 text-center text-2xl font-bold py-1 focus:outline-none"
              style={{
                background: 'transparent',
                color: 'var(--cp-on-surface)',
                border: 'none',
              }}
              min="1"
              max="999"
              disabled={calendarApproved}
            />
            {tournamentNumber !== nextTournamentNumber && (
              <span style={{ fontSize: 'var(--cp-caption-size)', color: '#FFC107' }}>
                (sugerido: {nextTournamentNumber})
              </span>
            )}
          </div>
        </div>
        {calendarApproved && (
          <div
            className="flex items-center gap-1 px-2 py-1"
            style={{
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '4px',
              color: '#22c55e',
              fontSize: 'var(--cp-caption-size)',
            }}
          >
            <Check size={12} />
            Calendario aprobado
          </div>
        )}
      </div>

      {/* Step Tabs */}
      <div className="flex gap-1">
        {STEPS.map((step, index) => {
          const isActive = currentStep === step.id
          const isCompleted = index === 0 ? calendarApproved : canProceed(step.id)
          const isDisabled = index > 0 && !calendarApproved

          return (
            <button
              key={step.id}
              onClick={() => !isDisabled && setCurrentStep(step.id)}
              disabled={isDisabled}
              className="flex-1 flex items-center justify-center gap-2 py-2 transition-all"
              style={{
                background: isActive ? '#E53935' : 'var(--cp-surface)',
                border: `1px solid ${isActive ? '#E53935' : 'var(--cp-surface-border)'}`,
                borderRadius: '4px',
                color: isActive ? 'white' : isDisabled ? 'var(--cp-on-surface-muted)' : 'var(--cp-on-surface)',
                opacity: isDisabled ? 0.5 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                fontSize: 'var(--cp-caption-size)',
              }}
            >
              {step.icon}
              <span className="hidden sm:inline">{step.label}</span>
              {isCompleted && !isActive && (
                <Check size={12} style={{ color: '#22c55e' }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div
          className="flex items-center gap-2 p-3"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '4px',
          }}
        >
          <AlertCircle size={16} style={{ color: '#ef4444' }} />
          <p style={{ color: '#ef4444', fontSize: 'var(--cp-body-size)' }}>{error}</p>
        </div>
      )}

      {/* Step Content */}
      {currentStep === 'calendario' && (
        <CalendarStep
          gameDates={gameDates}
          validDatesCount={validDatesCount}
          calendarApproved={calendarApproved}
          saving={saving}
          updateGameDate={updateGameDate}
          saveCalendar={saveCalendar}
          approveCalendar={approveCalendar}
          resetCalendar={() => {
            setGameDates(generateInitialDates())
            setCalendarApproved(false)
          }}
        />
      )}

      {currentStep === 'participantes' && (
        <ParticipantsStep
          players={availablePlayers}
          selectedIds={selectedParticipants}
          toggleParticipant={toggleParticipant}
          selectAll={() => setSelectedParticipants(availablePlayers.map(p => p.id))}
          selectNone={() => setSelectedParticipants([])}
        />
      )}

      {currentStep === 'configuracion' && (
        <ConfigStep
          blindLevels={blindLevels}
          setBlindLevels={setBlindLevels}
          creating={creating}
          createTournament={createTournament}
          canCreate={canProceed('configuracion')}
        />
      )}
    </div>
  )
}

// Calendar Step Component
interface CalendarStepProps {
  gameDates: GeneratedDate[]
  validDatesCount: number
  calendarApproved: boolean
  saving: boolean
  updateGameDate: (index: number, date: string) => void
  saveCalendar: () => void
  approveCalendar: () => void
  resetCalendar: () => void
}

function CalendarStep({
  gameDates,
  validDatesCount,
  calendarApproved,
  saving,
  updateGameDate,
  saveCalendar,
  approveCalendar,
  resetCalendar
}: CalendarStepProps) {
  return (
    <div className="space-y-3">
      {/* Info */}
      <p style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}>
        Selecciona la primera fecha y el sistema genera las 12 fechas del torneo (cada 15 dias en martes).
      </p>

      {/* Dates Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {gameDates.map((gameDate, index) => {
          const dateObj = gameDate.scheduledDate
            ? new Date(gameDate.scheduledDate + 'T12:00:00')
            : null
          const isValid = dateObj && !isNaN(dateObj.getTime())

          return (
            <div
              key={gameDate.dateNumber}
              className="text-center p-2"
              style={{
                background: 'var(--cp-surface)',
                border: `1px solid ${index === 0 ? '#E53935' : 'var(--cp-surface-border)'}`,
                borderRadius: '4px',
              }}
            >
              <p style={{ fontSize: '10px', color: 'var(--cp-on-surface-muted)' }}>
                F{gameDate.dateNumber}
              </p>
              {isValid ? (
                <>
                  <p className="text-xl font-bold" style={{ color: 'var(--cp-on-surface)' }}>
                    {dateObj!.getDate()}
                  </p>
                  <p style={{ fontSize: '11px', color: '#E53935', fontWeight: 600 }}>
                    {dateObj!.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}
                  </p>
                </>
              ) : (
                <p className="text-xl font-bold" style={{ color: 'var(--cp-on-surface-muted)' }}>
                  --
                </p>
              )}
              {!calendarApproved && (
                <div className="relative mt-1 flex justify-center">
                  <input
                    type="date"
                    value={gameDate.scheduledDate || ''}
                    onChange={(e) => updateGameDate(index, e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    style={{ width: '100%', height: '100%' }}
                  />
                  <button
                    type="button"
                    className="p-1.5 transition-all hover:bg-white/10"
                    style={{
                      background: 'var(--cp-background)',
                      border: '1px solid var(--cp-surface-border)',
                      borderRadius: '4px',
                    }}
                  >
                    <Calendar size={14} style={{ color: 'var(--cp-on-surface-muted)' }} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={resetCalendar}
          disabled={saving || calendarApproved}
          className="flex-1 py-2 font-medium transition-all disabled:opacity-50"
          style={{
            background: 'transparent',
            border: '1px solid var(--cp-surface-border)',
            borderRadius: '4px',
            color: 'var(--cp-on-surface-muted)',
          }}
        >
          Resetear
        </button>
        <button
          onClick={saveCalendar}
          disabled={saving || validDatesCount !== 12}
          className="flex-1 py-2 font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
            borderRadius: '4px',
            color: 'var(--cp-on-surface)',
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          Guardar
        </button>
        {!calendarApproved && (
          <button
            onClick={approveCalendar}
            disabled={saving || validDatesCount !== 12}
            className="flex-1 py-2 font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: '#E53935',
              borderRadius: '4px',
              color: 'white',
            }}
          >
            <Check size={16} />
            Aprobar
          </button>
        )}
      </div>

      {/* Status */}
      <p className="text-center" style={{ fontSize: 'var(--cp-caption-size)', color: validDatesCount === 12 ? '#22c55e' : 'var(--cp-on-surface-muted)' }}>
        {validDatesCount}/12 fechas definidas
      </p>
    </div>
  )
}

// Participants Step Component
interface ParticipantsStepProps {
  players: Player[]
  selectedIds: string[]
  toggleParticipant: (id: string) => void
  selectAll: () => void
  selectNone: () => void
}

function ParticipantsStep({
  players,
  selectedIds,
  toggleParticipant,
  selectAll,
  selectNone
}: ParticipantsStepProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}>
          Participantes: <span style={{ color: '#E53935' }}>{selectedIds.length}</span>/{players.length}
        </p>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1 text-sm"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              borderRadius: '4px',
              color: 'var(--cp-on-surface)',
            }}
          >
            Todos
          </button>
          <button
            onClick={selectNone}
            className="px-3 py-1 text-sm"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              borderRadius: '4px',
              color: 'var(--cp-on-surface)',
            }}
          >
            Ninguno
          </button>
        </div>
      </div>

      {/* Players Grid */}
      <div
        className="grid grid-cols-3 gap-1 max-h-80 overflow-y-auto p-2"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
          borderRadius: '4px',
        }}
      >
        {players.map((player) => {
          const isSelected = selectedIds.includes(player.id)
          return (
            <button
              key={player.id}
              onClick={() => toggleParticipant(player.id)}
              className="p-2 text-left transition-all"
              style={{
                background: isSelected ? 'rgba(229, 57, 53, 0.15)' : 'transparent',
                border: `1px solid ${isSelected ? '#E53935' : 'transparent'}`,
                borderRadius: '4px',
              }}
            >
              <p
                className="text-sm truncate"
                style={{ color: isSelected ? 'var(--cp-on-surface)' : 'var(--cp-on-surface-muted)' }}
              >
                {player.firstName}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Config Step Component
interface ConfigStepProps {
  blindLevels: BlindLevel[]
  setBlindLevels: (levels: BlindLevel[]) => void
  creating: boolean
  createTournament: () => void
  canCreate: boolean
}

function ConfigStep({
  blindLevels,
  setBlindLevels,
  creating,
  createTournament,
  canCreate
}: ConfigStepProps) {
  const [showBlinds, setShowBlinds] = useState(false)

  return (
    <div className="space-y-3">
      {/* Blinds Accordion */}
      <div
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
          borderRadius: '4px',
        }}
      >
        <button
          onClick={() => setShowBlinds(!showBlinds)}
          className="w-full flex items-center justify-between p-3"
        >
          <span style={{ color: 'var(--cp-on-surface)', fontSize: 'var(--cp-body-size)' }}>
            Estructura de Blinds ({blindLevels.length} niveles)
          </span>
          <ChevronDown
            size={16}
            style={{
              color: 'var(--cp-on-surface-muted)',
              transform: showBlinds ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s'
            }}
          />
        </button>

        {showBlinds && (
          <div className="p-3 pt-0 space-y-2">
            <div className="grid grid-cols-4 gap-2 text-center mb-2">
              <p style={{ fontSize: '10px', color: 'var(--cp-on-surface-muted)' }}>Nivel</p>
              <p style={{ fontSize: '10px', color: 'var(--cp-on-surface-muted)' }}>SB</p>
              <p style={{ fontSize: '10px', color: 'var(--cp-on-surface-muted)' }}>BB</p>
              <p style={{ fontSize: '10px', color: 'var(--cp-on-surface-muted)' }}>Min</p>
            </div>
            {blindLevels.map((blind, index) => (
              <div key={index} className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  value={blind.level}
                  disabled
                  className="text-center text-sm p-1"
                  style={{
                    background: 'var(--cp-background)',
                    border: '1px solid var(--cp-surface-border)',
                    borderRadius: '4px',
                    color: 'var(--cp-on-surface)',
                  }}
                />
                <input
                  type="number"
                  value={blind.smallBlind}
                  onChange={(e) => {
                    const newLevels = [...blindLevels]
                    newLevels[index].smallBlind = parseInt(e.target.value) || 0
                    setBlindLevels(newLevels)
                  }}
                  className="text-center text-sm p-1 focus:outline-none"
                  style={{
                    background: 'var(--cp-background)',
                    border: '1px solid var(--cp-surface-border)',
                    borderRadius: '4px',
                    color: 'var(--cp-on-surface)',
                  }}
                />
                <input
                  type="number"
                  value={blind.bigBlind}
                  onChange={(e) => {
                    const newLevels = [...blindLevels]
                    newLevels[index].bigBlind = parseInt(e.target.value) || 0
                    setBlindLevels(newLevels)
                  }}
                  className="text-center text-sm p-1 focus:outline-none"
                  style={{
                    background: 'var(--cp-background)',
                    border: '1px solid var(--cp-surface-border)',
                    borderRadius: '4px',
                    color: 'var(--cp-on-surface)',
                  }}
                />
                <input
                  type="number"
                  value={blind.duration}
                  onChange={(e) => {
                    const newLevels = [...blindLevels]
                    newLevels[index].duration = parseInt(e.target.value) || 0
                    setBlindLevels(newLevels)
                  }}
                  className="text-center text-sm p-1 focus:outline-none"
                  style={{
                    background: 'var(--cp-background)',
                    border: '1px solid var(--cp-surface-border)',
                    borderRadius: '4px',
                    color: 'var(--cp-on-surface)',
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Button */}
      <button
        onClick={createTournament}
        disabled={!canCreate || creating}
        className="w-full py-3 font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        style={{
          background: '#E53935',
          borderRadius: '4px',
          color: 'white',
        }}
      >
        {creating ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Creando torneo...
          </>
        ) : (
          <>
            <Check size={18} />
            Crear Torneo
          </>
        )}
      </button>
    </div>
  )
}
