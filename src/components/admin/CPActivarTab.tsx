'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@prisma/client'
import { Play, Loader2, UserPlus, Calendar, Users, ChevronDown, Trash2, Trophy, Check, ChevronRight } from 'lucide-react'
import TournamentCompletionModal from '@/components/tournaments/TournamentCompletionModal'
import { formatDateForInput, validateTuesdayDate } from '@/lib/date-utils'
import { buildAuthHeaders, getStoredAuthToken } from '@/lib/client-auth'

const RED = '#E53935'
const PINK = '#EC407A'

function RosterAvatar({ photoUrl, name, size = 32 }: { photoUrl?: string; name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#3A322B' }}>
      {photoUrl ? (
        <Image src={photoUrl} alt={name} width={size} height={size} className="object-cover w-full h-full" unoptimized />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ fontSize: size * 0.35, fontWeight: 800, color: '#fff' }}>
          {initials}
        </div>
      )}
    </div>
  )
}

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

interface BlockedDate {
  id: number
  dateNumber: number
  status: string
}

export default function CPActivarTab() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [updatingDate, setUpdatingDate] = useState(false)
  const [deleting, setDeleting] = useState(false)
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
  const [blockedDate, setBlockedDate] = useState<BlockedDate | null>(null)
  const [missingDate, setMissingDate] = useState<number | null>(null)
  const [missingDateScheduled, setMissingDateScheduled] = useState<string>('')
  const [showCompletionModal, setShowCompletionModal] = useState(false)

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
          setBlockedDate(data.blockedDate || null)
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

        // Check for missing dates (deleted dates that need to be recreated)
        if (data.missingDate) {
          setMissingDate(data.missingDate)
          // Set default to next Tuesday
          const today = new Date()
          const nextTuesday = new Date(today)
          const daysUntilTuesday = (2 - today.getDay() + 7) % 7 || 7
          nextTuesday.setDate(today.getDate() + daysUntilTuesday)
          setMissingDateScheduled(nextTuesday.toISOString().split('T')[0])
          setSelectedPlayers(data.registeredPlayers.map((p: Player) => p.id))
        } else if (data.availableDates.length > 0) {
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
    // Handle missing date (recreate)
    if (missingDate && tournament) {
      if (!missingDateScheduled) {
        setError('Selecciona una fecha para activar')
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
            dateNumber: missingDate,
            scheduledDate: missingDateScheduled,
            playerIds: [...selectedPlayers, ...selectedGuests]
          })
        })

        if (response.ok) {
          const result = await response.json()
          setActiveGameDate(result.gameDate)
          setMissingDate(null)
          router.push(`/game-dates/${result.gameDate.id}/confirm`)
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Error al crear fecha')
        }
      } catch (err) {
        setError('Error al crear fecha de juego')
      } finally {
        setActivating(false)
      }
      return
    }

    // Handle existing pending date
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

  const handleDeleteDate = async (dateIdToDelete?: number) => {
    const targetId = dateIdToDelete || selectedDateId
    if (!targetId) return

    // Obtener info de la fecha a eliminar
    const selectedDateData = availableDates.find(d => d.id === targetId)
    const dateNumber = selectedDateData?.dateNumber || blockedDate?.dateNumber || '?'

    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar la Fecha ${dateNumber}?\n\nEsta acción no se puede deshacer.`
    )
    if (!confirmDelete) return

    try {
      setDeleting(true)
      setError('')

      const response = await fetch(`/api/game-dates/${targetId}`, {
        method: 'DELETE',
        headers: buildAuthHeaders()
      })

      if (response.ok) {
        // Si era una fecha bloqueada, limpiar el estado y recargar
        if (blockedDate && blockedDate.id === targetId) {
          setBlockedDate(null)
          setError('')
          loadInitialData() // Recargar para obtener fechas disponibles
          return
        }

        // Remover la fecha eliminada de la lista
        const updatedDates = availableDates.filter(d => d.id !== targetId)
        setAvailableDates(updatedDates)

        // Seleccionar la siguiente fecha disponible
        if (updatedDates.length > 0) {
          setSelectedDateId(updatedDates[0].id)
          setSelectedDate(new Date(updatedDates[0].scheduledDate))
        } else {
          setSelectedDateId(null)
          setSelectedDate(undefined)
        }

        setSelectedPlayers([])
        setSelectedGuests([])
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al eliminar fecha')
      }
    } catch (err) {
      setError('Error al eliminar fecha')
    } finally {
      setDeleting(false)
    }
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

  const totalEnfermos = registeredPlayers.length + additionalPlayers.length
  const totalInvitados = guests.length

  const lastConfirmDate = selectedDate
    ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1)
    : null

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

  // Blocked state - show delete button if it's a CREATED date
  if (error && error.includes('Existe una fecha')) {
    // Siempre mostrar botón si hay blockedDate (para debug) - status check removido temporalmente
    const canDelete = !!blockedDate

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

        {/* Botón para eliminar fecha CREATED */}
        {canDelete && (
          <button
            onClick={() => handleDeleteDate(blockedDate.id)}
            disabled={deleting}
            className="mt-4 flex items-center justify-center gap-2 mx-auto px-4 py-2"
            style={{
              background: deleting ? 'rgba(229, 57, 53, 0.5)' : '#E53935',
              color: 'white',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: 'var(--cp-caption-size)',
            }}
          >
            {deleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            {deleting ? 'Eliminando...' : `Eliminar Fecha ${blockedDate.dateNumber}`}
          </button>
        )}
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

  // Missing date - needs to be recreated
  if (missingDate && tournament) {
    return (
      <div className="space-y-4">
        {/* Missing Date Header */}
        <div
          className="p-4"
          style={{
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '4px',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={20} style={{ color: '#FBBF24' }} />
            <p style={{ color: '#FBBF24', fontSize: 'var(--cp-body-size)', fontWeight: 600 }}>
              Fecha {missingDate} - Necesita ser creada
            </p>
          </div>
          <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
            Esta fecha fue eliminada y necesita ser recreada para continuar.
          </p>
        </div>

        {/* Date Selection Row */}
        <div className="flex gap-3">
          {/* Date Input */}
          <div className="flex-1 relative">
            <input
              type="date"
              value={missingDateScheduled}
              onChange={(e) => setMissingDateScheduled(e.target.value)}
              className="w-full px-3 py-2.5"
              style={{
                background: 'var(--cp-background)',
                border: '1px solid var(--cp-surface-border)',
                color: 'var(--cp-on-surface)',
                fontSize: 'var(--cp-body-size)',
                borderRadius: '4px',
                fontWeight: 600,
                colorScheme: 'dark',
              }}
            />
          </div>

          {/* Activate Button */}
          <button
            onClick={handleActivate}
            disabled={activating || selectedPlayers.length === 0 || !missingDateScheduled}
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
            {activating ? 'Creando...' : `CREAR FECHA ${missingDate}`}
          </button>
        </div>

        {/* Stat Tabs: Enfermos, Invitados */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('enfermos')}
            className="text-left transition-all"
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              background: activeTab === 'enfermos' ? 'rgba(229,57,53,0.16)' : 'var(--cp-surface)',
              border: `1px solid ${activeTab === 'enfermos' ? RED : 'var(--cp-surface-border)'}`,
            }}
          >
            <div className="flex items-start justify-between">
              <Users size={16} color={RED} />
              <ChevronRight size={14} style={{ color: 'var(--cp-on-surface-muted)' }} />
            </div>
            <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--cp-on-surface-muted)', marginTop: 6 }}>
              Enfermos
            </p>
            <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--cp-on-surface)' }}>
              {selectedPlayers.length}<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-on-surface-muted)' }}>/{totalEnfermos}</span>
            </p>
          </button>

          <button
            onClick={() => setActiveTab('invitados')}
            className="text-left transition-all"
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              background: activeTab === 'invitados' ? 'rgba(236,64,122,0.16)' : 'var(--cp-surface)',
              border: `1px solid ${activeTab === 'invitados' ? PINK : 'var(--cp-surface-border)'}`,
            }}
          >
            <div className="flex items-start justify-between">
              <UserPlus size={16} color={PINK} />
              <ChevronRight size={14} style={{ color: 'var(--cp-on-surface-muted)' }} />
            </div>
            <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--cp-on-surface-muted)', marginTop: 6 }}>
              Invitados
            </p>
            <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--cp-on-surface)' }}>
              {selectedGuests.length}<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-on-surface-muted)' }}>/{totalInvitados}</span>
            </p>
          </button>
        </div>

        {/* Jugadores del Torneo */}
        <div>
          <div
            className="p-3"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              borderRadius: 14,
            }}
          >
            <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {currentPlayers.map((player) => {
                const isSelected = activeTab === 'enfermos'
                  ? selectedPlayers.includes(player.id)
                  : selectedGuests.includes(player.id)
                const accent = activeTab === 'invitados' ? PINK : RED

                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    className="flex items-center gap-1.5 transition-all"
                    style={{
                      padding: '6px 8px',
                      borderRadius: 12,
                      background: isSelected ? accent : 'var(--cp-background)',
                      border: `1px solid ${isSelected ? accent : 'var(--cp-surface-border)'}`,
                    }}
                  >
                    <RosterAvatar photoUrl={player.photoUrl} name={getDisplayName(player)} size={26} />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 11,
                        fontWeight: 600,
                        color: isSelected ? '#fff' : 'var(--cp-on-surface)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textAlign: 'left'
                      }}
                    >
                      {getDisplayName(player)}
                    </span>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isSelected ? '#22c55e' : 'transparent',
                        border: isSelected ? 'none' : '1.5px solid rgba(255,255,255,0.25)'
                      }}
                    >
                      {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                    </div>
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
                  color: PINK,
                  borderRadius: 100,
                  fontSize: 'var(--cp-caption-size)',
                  fontWeight: 600,
                }}
              >
                <UserPlus size={14} />
                CREAR INVITADO
              </button>
            )}
          </div>
        </div>

        {/* Error Messages */}
        {error && (
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
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Fecha */}
      <div>
        <div className="flex gap-2">
          {/* Date Selector */}
          <div
            className="flex-1 relative flex items-center gap-2"
            style={{
              padding: '10px 12px',
              borderRadius: 14,
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
            }}
          >
            <Calendar size={16} style={{ color: 'var(--cp-on-surface-muted)', flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--cp-on-surface)' }}>
                {availableDates.find(d => d.id === selectedDateId)
                  ? `Fecha ${availableDates.find(d => d.id === selectedDateId)!.dateNumber}`
                  : 'Selecciona fecha'}
              </p>
              {selectedDate && (
                <p style={{ fontSize: 10, color: 'var(--cp-on-surface-muted)' }}>
                  {selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                </p>
              )}
            </div>
            <ChevronDown size={14} style={{ color: 'var(--cp-on-surface-muted)', flexShrink: 0 }} />
            <select
              value={selectedDateId || ''}
              onChange={(e) => handleDateSelection(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            >
              {availableDates.map((date) => (
                <option key={date.id} value={date.id}>
                  Fecha {date.dateNumber}
                </option>
              ))}
            </select>
          </div>

          {/* Delete Button */}
          <button
            onClick={() => handleDeleteDate()}
            disabled={deleting || !selectedDateId}
            className="flex items-center justify-center"
            style={{
              width: 44,
              background: deleting ? 'rgba(156, 163, 175, 0.5)' : 'rgba(156, 163, 175, 0.2)',
              border: '1px solid rgba(156, 163, 175, 0.3)',
              color: 'var(--cp-on-surface-muted)',
              borderRadius: 14,
              opacity: deleting || !selectedDateId ? 0.5 : 1,
            }}
            title="Eliminar fecha"
          >
            {deleting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
          </button>
        </div>

        {/* Stat Row: Enfermos, Invitados, Fecha */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <button
            onClick={() => setActiveTab('enfermos')}
            className="text-left transition-all"
            style={{
              padding: '10px 10px',
              borderRadius: 14,
              background: activeTab === 'enfermos' ? 'rgba(229,57,53,0.16)' : 'var(--cp-surface)',
              border: `1px solid ${activeTab === 'enfermos' ? RED : 'var(--cp-surface-border)'}`,
            }}
          >
            <Users size={14} color={RED} />
            <p style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--cp-on-surface-muted)', marginTop: 4 }}>
              Enfermos
            </p>
            <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--cp-on-surface)' }}>
              {selectedPlayers.length}<span style={{ fontSize: 10, fontWeight: 600, color: 'var(--cp-on-surface-muted)' }}>/{totalEnfermos}</span>
            </p>
          </button>

          <button
            onClick={() => setActiveTab('invitados')}
            className="text-left transition-all"
            style={{
              padding: '10px 10px',
              borderRadius: 14,
              background: activeTab === 'invitados' ? 'rgba(236,64,122,0.16)' : 'var(--cp-surface)',
              border: `1px solid ${activeTab === 'invitados' ? PINK : 'var(--cp-surface-border)'}`,
            }}
          >
            <UserPlus size={14} color={PINK} />
            <p style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--cp-on-surface-muted)', marginTop: 4 }}>
              Invitados
            </p>
            <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--cp-on-surface)' }}>
              {selectedGuests.length}<span style={{ fontSize: 10, fontWeight: 600, color: 'var(--cp-on-surface-muted)' }}>/{totalInvitados}</span>
            </p>
          </button>

          {/* Date Display */}
          <div
            className="relative"
            style={{
              padding: '10px 10px',
              borderRadius: 14,
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
            }}
          >
            <Calendar size={14} style={{ color: 'var(--cp-on-surface-muted)' }} />
            {lastConfirmDate ? (
              <>
                <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--cp-on-surface)', marginTop: 4 }}>
                  {lastConfirmDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase()}
                </p>
                <p style={{ fontSize: 8, color: 'var(--cp-on-surface-muted)', lineHeight: 1.2 }}>
                  Último día para confirmar
                </p>
              </>
            ) : (
              <p style={{ fontSize: 8, color: 'var(--cp-on-surface-muted)', marginTop: 4 }}>Sin fecha</p>
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
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 14 }}>
                <Loader2 size={16} className="animate-spin" style={{ color: RED }} />
              </div>
            )}
          </div>
        </div>

        {/* Activate Button */}
        <button
          onClick={handleActivate}
          disabled={activating || selectedPlayers.length === 0}
          className="w-full flex items-center gap-3 mt-2"
          style={{
            padding: '12px 16px',
            background: activating || selectedPlayers.length === 0 ? 'rgba(229, 57, 53, 0.5)' : RED,
            color: 'white',
            borderRadius: 14,
            opacity: activating || selectedPlayers.length === 0 ? 0.7 : 1,
          }}
        >
          {activating ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Play size={20} fill="white" />
          )}
          <p style={{ fontSize: 14, fontWeight: 800, flex: 1, textAlign: 'left' }}>
            {activating ? 'ACTIVANDO...' : 'ACTIVAR FECHA'}
          </p>
          <div className="text-right">
            <p style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{selectedPlayers.length + selectedGuests.length}</p>
            <p style={{ fontSize: 8, opacity: 0.85, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Participantes</p>
          </div>
        </button>
      </div>

      {/* Jugadores del Torneo */}
      <div>
        <div
          className="p-3"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
            borderRadius: 14,
          }}
        >
          <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
            {currentPlayers.map((player) => {
              const isSelected = activeTab === 'enfermos'
                ? selectedPlayers.includes(player.id)
                : selectedGuests.includes(player.id)
              const accent = activeTab === 'invitados' ? PINK : RED

              return (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className="flex items-center gap-1.5 transition-all"
                  style={{
                    padding: '6px 8px',
                    borderRadius: 12,
                    background: isSelected ? accent : 'var(--cp-background)',
                    border: `1px solid ${isSelected ? accent : 'var(--cp-surface-border)'}`,
                  }}
                >
                  <RosterAvatar photoUrl={player.photoUrl} name={getDisplayName(player)} size={26} />
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 11,
                      fontWeight: 600,
                      color: isSelected ? '#fff' : 'var(--cp-on-surface)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      textAlign: 'left'
                    }}
                  >
                    {getDisplayName(player)}
                  </span>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isSelected ? '#22c55e' : 'transparent',
                      border: isSelected ? 'none' : '1.5px solid rgba(255,255,255,0.25)'
                    }}
                  >
                    {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                  </div>
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
                color: PINK,
                borderRadius: 100,
                fontSize: 'var(--cp-caption-size)',
                fontWeight: 600,
              }}
            >
              <UserPlus size={14} />
              CREAR INVITADO
            </button>
          )}
        </div>
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

      {/* Empty State - All dates completed, show close tournament button */}
      {availableDates.length === 0 && !error && tournament && (
        <div
          className="p-8 text-center"
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '4px',
          }}
        >
          <Trophy size={32} className="mx-auto mb-3" style={{ color: '#10b981' }} />
          <p style={{ color: '#10b981', fontSize: 'var(--cp-body-size)', fontWeight: 600 }}>
            Torneo Completado
          </p>
          <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }} className="mb-4">
            Todas las fechas del {tournament.name} han sido jugadas
          </p>
          <button
            onClick={() => setShowCompletionModal(true)}
            className="flex items-center justify-center gap-2 mx-auto px-6 py-3"
            style={{
              background: '#10b981',
              color: 'white',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: 'var(--cp-body-size)',
            }}
          >
            <Trophy size={18} />
            CERRAR TORNEO {tournament.number}
          </button>
        </div>
      )}

      {/* Tournament Completion Modal */}
      {tournament && (
        <TournamentCompletionModal
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          tournament={{ id: tournament.id, name: tournament.name, number: tournament.number }}
          onComplete={() => {
            setShowCompletionModal(false)
            // Reload the page to show updated state
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
