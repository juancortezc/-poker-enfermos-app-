'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@prisma/client'
import { Play, Loader2, UserPlus, Calendar, Users, ChevronDown } from 'lucide-react'
import { formatDateForInput, validateTuesdayDate } from '@/lib/date-utils'
import { buildAuthHeaders, getStoredAuthToken } from '@/lib/client-auth'

interface Player {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  photoUrl?: string
  isActive: boolean
  aliases?: string[]
}

interface Tournament {
  id: number
  name: string
  number: number
}

interface AvailableDate {
  id: number
  dateNumber: number
  scheduledDate: string
  status: string
}

interface GameDateData {
  id?: number
  dateNumber: number
  scheduledDate: string
  status: string
  playerIds: string[]
  tournament: Tournament
  playersCount: number
}

export default function CPActivarTab() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [updatingDate, setUpdatingDate] = useState(false)
  const [error, setError] = useState('')
  const [dateError, setDateError] = useState('')

  // Data states
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([])
  const [selectedDateId, setSelectedDateId] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [activeGameDate, setActiveGameDate] = useState<GameDateData | null>(null)

  // Player states
  const [registeredPlayers, setRegisteredPlayers] = useState<Player[]>([])
  const [additionalPlayers, setAdditionalPlayers] = useState<Player[]>([])
  const [guests, setGuests] = useState<Player[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [selectedGuests, setSelectedGuests] = useState<string[]>([])

  // UI states
  const [activeTab, setActiveTab] = useState<'enfermos' | 'invitados'>('enfermos')

  useEffect(() => {
    const token = getStoredAuthToken()
    if (token) {
      loadInitialData()
    }
  }, [user])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError('')

      const token = getStoredAuthToken()
      if (!token) {
        setError('No se encontró autenticación')
        return
      }

      const authHeaders = buildAuthHeaders()

      // Check for active game date
      const activeResponse = await fetch('/api/game-dates/active', {
        headers: authHeaders
      })

      if (activeResponse.ok) {
        const activeData = await activeResponse.json()
        if (activeData && activeData.activeDate) {
          setActiveGameDate(activeData.activeDate)
          setTournament(activeData.activeDate.tournament)
          setLoading(false)
          return
        }
      }

      // Load available dates and players
      const availableResponse = await fetch('/api/game-dates/available-dates', {
        headers: authHeaders
      })

      if (availableResponse.ok) {
        const data = await availableResponse.json()

        if (data.blocked) {
          setError(data.blockedReason || 'No se pueden crear fechas en este momento')
          setAvailableDates([])
          setRegisteredPlayers([])
          setAdditionalPlayers([])
          setTournament(null)
          return
        }

        setTournament(data.tournament)
        setAvailableDates(data.availableDates)
        setRegisteredPlayers(data.registeredPlayers)
        setAdditionalPlayers(data.additionalPlayers || [])

        if (data.availableDates.length > 0) {
          const firstDate = data.availableDates[0]
          setSelectedDateId(firstDate.id)
          setSelectedDate(new Date(firstDate.scheduledDate))
          setSelectedPlayers(data.registeredPlayers.map((p: Player) => p.id))
        }

        await loadGuests()
      } else {
        if (availableResponse.status === 401) {
          setError('Error de autenticación')
        } else {
          setError(`Error al obtener fechas disponibles`)
        }
      }
    } catch (err) {
      setError(`Error al cargar los datos`)
    } finally {
      setLoading(false)
    }
  }

  const loadGuests = async () => {
    try {
      const response = await fetch('/api/players/available-guests', {
        headers: buildAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setGuests(data.externalGuests)
      }
    } catch (err) {
      console.error('Error loading guests:', err)
    }
  }

  const handleDateSelection = async (dateId: number) => {
    const selectedDateData = availableDates.find(d => d.id === dateId)
    if (!selectedDateData) return

    setSelectedDateId(dateId)
    setSelectedDate(new Date(selectedDateData.scheduledDate))
    setSelectedPlayers(registeredPlayers.map(p => p.id))
    setSelectedGuests([])
    setActiveTab('enfermos')
  }

  const togglePlayer = (playerId: string) => {
    if (activeTab === 'enfermos') {
      setSelectedPlayers(prev =>
        prev.includes(playerId)
          ? prev.filter(id => id !== playerId)
          : [...prev, playerId]
      )
    } else {
      setSelectedGuests(prev =>
        prev.includes(playerId)
          ? prev.filter(id => id !== playerId)
          : [...prev, playerId]
      )
    }
  }

  const handleActivate = async () => {
    if (!tournament || !selectedDateId || !selectedDate) {
      setError('Datos incompletos para activar fecha')
      return
    }

    try {
      setActivating(true)
      setError('')

      const response = await fetch('/api/game-dates', {
        method: 'POST',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({
          tournamentId: tournament.id,
          dateNumber: availableDates.find(d => d.id === selectedDateId)?.dateNumber,
          scheduledDate: selectedDate.toISOString(),
          playerIds: [...selectedPlayers, ...selectedGuests]
        })
      })

      if (response.ok) {
        const result = await response.json()
        setActiveGameDate(result.gameDate)
        setAvailableDates(prev => prev.filter(d => d.id !== selectedDateId))
        router.push(`/game-dates/${result.gameDate.id}/confirm`)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al activar fecha')
      }
    } catch (err) {
      setError('Error al activar fecha de juego')
    } finally {
      setActivating(false)
    }
  }

  const handleCreateGuest = () => {
    router.push('/players/new?type=invitado&returnTo=/admin')
  }

  const handleDateChange = async (newDateString: string) => {
    if (!selectedDateId || !tournament) return

    try {
      setUpdatingDate(true)
      setDateError('')

      const dateValidation = validateTuesdayDate(newDateString)
      if (!dateValidation.valid) {
        setDateError(dateValidation.message || 'Fecha inválida')
        return
      }

      const response = await fetch(`/api/game-dates/${selectedDateId}`, {
        method: 'PUT',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({
          action: 'update',
          scheduledDate: newDateString
        })
      })

      if (response.ok) {
        setSelectedDate(new Date(newDateString + 'T12:00:00'))
        setAvailableDates(prev => prev.map(date =>
          date.id === selectedDateId
            ? { ...date, scheduledDate: newDateString }
            : date
        ))
        setError('')
      } else {
        const errorData = await response.json()
        setDateError(errorData.error || 'Error al actualizar fecha')
      }
    } catch (err) {
      setDateError('Error al actualizar fecha')
    } finally {
      setUpdatingDate(false)
    }
  }

  const getDisplayName = (player: Player) => {
    const firstName = player.aliases && player.aliases.length > 0
      ? player.aliases[0]
      : player.firstName
    const lastNameInitial = player.lastName ? player.lastName.charAt(0).toUpperCase() : ''
    return lastNameInitial ? `${firstName} ${lastNameInitial}.` : firstName
  }

  const currentPlayers = activeTab === 'enfermos'
    ? [...registeredPlayers, ...additionalPlayers]
    : guests

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

  // Blocked state
  if (error && error.includes('Existe una fecha')) {
    return (
      <div
        className="p-6 text-center"
        style={{
          background: 'rgba(229, 57, 53, 0.1)',
          border: '1px solid rgba(229, 57, 53, 0.3)',
          borderRadius: '4px',
        }}
      >
        <Calendar size={32} className="mx-auto mb-3" style={{ color: '#E53935' }} />
        <p style={{ color: '#E53935', fontSize: 'var(--cp-body-size)', fontWeight: 600 }}>
          Acceso Bloqueado
        </p>
        <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }} className="mt-2">
          {error}
        </p>
      </div>
    )
  }

  // Active game date info
  if (activeGameDate) {
    return (
      <div
        className="p-6 text-center"
        style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '4px',
        }}
      >
        <Play size={32} className="mx-auto mb-3" style={{ color: '#22c55e' }} />
        <p style={{ color: '#22c55e', fontSize: 'var(--cp-body-size)', fontWeight: 600 }}>
          Fecha Activa
        </p>
        <p style={{ color: 'var(--cp-on-surface)', fontSize: 'var(--cp-body-size)' }} className="mt-2">
          {activeGameDate.tournament.name} - Fecha {activeGameDate.dateNumber}
        </p>
        <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
          {activeGameDate.playersCount} participantes
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Date Selection Row */}
      <div className="flex gap-3">
        {/* Date Selector */}
        <div className="flex-1 relative">
          <select
            value={selectedDateId || ''}
            onChange={(e) => handleDateSelection(Number(e.target.value))}
            className="w-full px-3 py-2.5 pr-10 appearance-none"
            style={{
              background: 'var(--cp-background)',
              border: '1px solid var(--cp-surface-border)',
              color: 'var(--cp-on-surface)',
              fontSize: 'var(--cp-body-size)',
              borderRadius: '4px',
              fontWeight: 600,
            }}
          >
            {availableDates.map((date) => (
              <option key={date.id} value={date.id}>
                Fecha {date.dateNumber}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--cp-on-surface-muted)' }}
          />
        </div>

        {/* Activate Button */}
        <button
          onClick={handleActivate}
          disabled={activating || selectedPlayers.length === 0}
          className="flex items-center justify-center gap-2 px-6 py-2.5"
          style={{
            background: activating || selectedPlayers.length === 0 ? 'rgba(229, 57, 53, 0.5)' : '#E53935',
            color: 'white',
            borderRadius: '4px',
            fontWeight: 600,
            fontSize: 'var(--cp-body-size)',
            opacity: activating || selectedPlayers.length === 0 ? 0.7 : 1,
          }}
        >
          {activating ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Play size={18} />
          )}
          {activating ? 'Activando...' : 'ACTIVAR'}
        </button>
      </div>

      {/* Tabs Row: Enfermos, Invitados, Date */}
      <div className="grid grid-cols-3 gap-2">
        {/* Enfermos Tab */}
        <button
          onClick={() => setActiveTab('enfermos')}
          className="py-2 px-3 text-center transition-all"
          style={{
            background: activeTab === 'enfermos' ? '#E53935' : 'var(--cp-surface)',
            border: `1px solid ${activeTab === 'enfermos' ? '#E53935' : 'var(--cp-surface-border)'}`,
            color: activeTab === 'enfermos' ? 'white' : 'var(--cp-on-surface)',
            borderRadius: '4px',
          }}
        >
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Enfermos
          </p>
          <p style={{ fontSize: '18px', fontWeight: 700 }}>
            {selectedPlayers.length}
          </p>
        </button>

        {/* Invitados Tab */}
        <button
          onClick={() => setActiveTab('invitados')}
          className="py-2 px-3 text-center transition-all"
          style={{
            background: activeTab === 'invitados' ? '#EC407A' : 'var(--cp-surface)',
            border: `1px solid ${activeTab === 'invitados' ? '#EC407A' : 'var(--cp-surface-border)'}`,
            color: activeTab === 'invitados' ? 'white' : 'var(--cp-on-surface)',
            borderRadius: '4px',
          }}
        >
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Invitados
          </p>
          <p style={{ fontSize: '18px', fontWeight: 700 }}>
            {selectedGuests.length}
          </p>
        </button>

        {/* Date Display */}
        <div
          className="py-2 px-3 text-center relative"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
            borderRadius: '4px',
          }}
        >
          {selectedDate && (
            <>
              <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--cp-on-surface-muted)' }}>
                {selectedDate.toLocaleDateString('es-ES', { month: 'short' })}
              </p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--cp-on-surface)' }}>
                {selectedDate.getDate()}
              </p>
            </>
          )}
          <input
            type="date"
            value={selectedDate ? formatDateForInput(selectedDate) : ''}
            onChange={(e) => handleDateChange(e.target.value)}
            disabled={updatingDate || !selectedDateId}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            style={{ colorScheme: 'dark' }}
          />
          {updatingDate && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '4px' }}>
              <Loader2 size={16} className="animate-spin" style={{ color: '#E53935' }} />
            </div>
          )}
        </div>
      </div>

      {/* Player List */}
      <div
        className="p-3"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
          borderRadius: '4px',
        }}
      >
        <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
          {currentPlayers.map((player) => {
            const isSelected = activeTab === 'enfermos'
              ? selectedPlayers.includes(player.id)
              : selectedGuests.includes(player.id)

            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                className="py-2 px-2 text-center transition-all"
                style={{
                  background: isSelected
                    ? activeTab === 'invitados' ? '#EC407A' : '#E53935'
                    : 'var(--cp-background)',
                  border: `1px solid ${isSelected
                    ? activeTab === 'invitados' ? '#EC407A' : '#E53935'
                    : 'var(--cp-surface-border)'}`,
                  color: isSelected ? 'white' : 'var(--cp-on-surface)',
                  borderRadius: '4px',
                  fontSize: 'var(--cp-caption-size)',
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {getDisplayName(player)}
              </button>
            )
          })}
        </div>

        {/* Create Guest Button */}
        {activeTab === 'invitados' && (
          <button
            onClick={handleCreateGuest}
            className="w-full mt-3 py-2 flex items-center justify-center gap-2"
            style={{
              background: 'rgba(236, 64, 122, 0.15)',
              border: '1px solid rgba(236, 64, 122, 0.3)',
              color: '#EC407A',
              borderRadius: '4px',
              fontSize: 'var(--cp-caption-size)',
              fontWeight: 600,
            }}
          >
            <UserPlus size={14} />
            CREAR INVITADO
          </button>
        )}
      </div>

      {/* Error Messages */}
      {error && !error.includes('Existe una fecha') && (
        <div
          className="p-3 text-center"
          style={{
            background: 'rgba(229, 57, 53, 0.1)',
            border: '1px solid rgba(229, 57, 53, 0.3)',
            borderRadius: '4px',
          }}
        >
          <p style={{ color: '#E53935', fontSize: 'var(--cp-caption-size)' }}>
            {error}
          </p>
        </div>
      )}

      {dateError && (
        <div
          className="p-3 flex items-center justify-center gap-2"
          style={{
            background: 'rgba(229, 57, 53, 0.1)',
            border: '1px solid rgba(229, 57, 53, 0.3)',
            borderRadius: '4px',
          }}
        >
          <Calendar size={14} style={{ color: '#E53935' }} />
          <p style={{ color: '#E53935', fontSize: 'var(--cp-caption-size)' }}>
            {dateError}
          </p>
        </div>
      )}

      {/* Empty State */}
      {availableDates.length === 0 && !error && (
        <div
          className="p-8 text-center"
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '4px',
          }}
        >
          <Calendar size={32} className="mx-auto mb-3" style={{ color: 'var(--cp-on-surface-muted)' }} />
          <p style={{ color: 'var(--cp-on-surface)', fontSize: 'var(--cp-body-size)' }}>
            No hay fechas disponibles
          </p>
          <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
            Todas las fechas del torneo han sido jugadas
          </p>
        </div>
      )}
    </div>
  )
}
