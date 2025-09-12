'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Loader2, Play, UserPlus, Calendar } from 'lucide-react'
import { formatDateForInput, validateTuesdayDate } from '@/lib/date-utils'

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

export default function GameDateConfigPage() {
  console.log('🎯 GameDateConfigPage component rendered')
  
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
  
  // Check permissions
  useEffect(() => {
    console.log('🔐 Checking permissions, user:', user ? { id: user.id, role: user.role } : 'null')
    
    if (user && user.role !== UserRole.Comision) {
      console.log('❌ User not Comision, redirecting to /admin')
      router.push('/admin')
      return
    }
    
    if (user) {
      console.log('✅ User has Comision permissions')
    }
  }, [user, router])

  // Load initial data
  useEffect(() => {
    console.log('🚀 GameDateConfigPage useEffect triggered')
    const pin = typeof window !== 'undefined' ? localStorage.getItem('poker-pin') : null
    const userInfo = user ? { id: user.id, role: user.role } : 'null'
    console.log('🔍 useEffect state:', { pin: pin?.substring(0, 4) + '***', user: userInfo })
    
    if (pin) {
      console.log('✅ PIN found, calling loadInitialData')
      loadInitialData()
    } else {
      console.log('❌ No PIN found, not loading data')
    }
  }, [user])

  const loadInitialData = async () => {
    try {
      console.log('🔄 GameDateConfigPage: Starting loadInitialData')
      setLoading(true)
      setError('')
      
      // Check if there's an active game date already
      const pin = typeof window !== 'undefined' ? localStorage.getItem('poker-pin') : null
      console.log('🔑 PIN for auth:', pin ? pin.substring(0, 4) + '***' : 'NO PIN FOUND')
      
      if (!pin) {
        console.error('❌ No PIN found in localStorage')
        setError('No se encontró autenticación. Redirigiendo al login...')
        setTimeout(() => {
          router.push('/admin')
        }, 1500)
        return
      }
      
      const activeResponse = await fetch('/api/game-dates/active', {
        headers: {
          'Authorization': pin ? `Bearer PIN:${pin}` : '',
          'Content-Type': 'application/json'
        }
      })
      
      console.log('📡 Active game date response:', activeResponse.status)

      if (activeResponse.ok) {
        const activeData = await activeResponse.json()
        console.log('📊 Active data:', activeData)
        if (activeData && activeData.activeDate) {
          console.log('✅ Found active game date, stopping here')
          setActiveGameDate(activeData.activeDate)
          setTournament(activeData.activeDate.tournament)
          // If there's an active date, we're done loading
          setLoading(false)
          return
        }
        console.log('📭 No active game date found, loading available dates')
      }

      // Load available dates and players
      console.log('🎯 Fetching available dates...')
      const availableResponse = await fetch('/api/game-dates/available-dates', {
        headers: {
          'Authorization': pin ? `Bearer PIN:${pin}` : '',
          'Content-Type': 'application/json'
        }
      })
      
      console.log('📡 Available dates response:', availableResponse.status)

      if (availableResponse.ok) {
        const data = await availableResponse.json()
        console.log('📋 Available dates data:', {
          tournament: data.tournament?.name,
          availableDatesCount: data.availableDates?.length,
          registeredPlayersCount: data.registeredPlayers?.length,
          additionalPlayersCount: data.additionalPlayers?.length
        })
        
        setTournament(data.tournament)
        setAvailableDates(data.availableDates)
        setRegisteredPlayers(data.registeredPlayers)
        setAdditionalPlayers(data.additionalPlayers || [])
        
        // Set first available date as default
        if (data.availableDates.length > 0) {
          const firstDate = data.availableDates[0]
          console.log('🎯 Setting default date:', firstDate.dateNumber)
          setSelectedDateId(firstDate.id)
          setSelectedDate(new Date(firstDate.scheduledDate))
          // Default selection: all registered players
          setSelectedPlayers(data.registeredPlayers.map((p: Player) => p.id))
        }
        
        // Load guests
        console.log('🎭 Loading guests...')
        await loadGuests()
      } else {
        console.error('❌ Available dates request failed:', availableResponse.status)
        const errorText = await availableResponse.text()
        console.error('Error details:', errorText)
        
        if (availableResponse.status === 401) {
          // Error de autenticación - intentar limpiar y redirigir
          console.error('❌ Error de autenticación - PIN inválido o expirado')
          setError('Error de autenticación. Por favor, vuelve a iniciar sesión.')
          // Opcionalmente, redirigir a login después de un delay
          setTimeout(() => {
            router.push('/admin')
          }, 2000)
        } else {
          setError(`Error al obtener fechas disponibles: ${availableResponse.status}`)
        }
      }
    } catch (err) {
      console.error('❌ Error in loadInitialData:', err)
      setError(`Error al cargar los datos: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    } finally {
      console.log('✅ GameDateConfigPage: loadInitialData completed')
      setLoading(false)
    }
  }

  const loadGuests = async () => {
    try {
      const pin = typeof window !== 'undefined' ? localStorage.getItem('poker-pin') : null
      const response = await fetch('/api/players/available-guests', {
        headers: {
          'Authorization': pin ? `Bearer PIN:${pin}` : '',
          'Content-Type': 'application/json'
        }
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
    
    // Reset selections to default (registered players checked)
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

      // Create or update game date
      const pin = typeof window !== 'undefined' ? localStorage.getItem('poker-pin') : null
      const response = await fetch('/api/game-dates', {
        method: 'POST',
        headers: {
          'Authorization': pin ? `Bearer PIN:${pin}` : '',
          'Content-Type': 'application/json'
        },
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
        // Reload data to show activated state
        await loadInitialData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al activar fecha')
      }
    } catch (err) {
      console.error('Error activating date:', err)
      setError('Error al activar fecha de juego')
    } finally {
      setActivating(false)
    }
  }

  const handleCreateGuest = () => {
    // Navigate to guest creation with return path
    router.push('/players/new?type=invitado&returnTo=/game-dates/config')
  }

  const handleDateChange = async (newDateString: string) => {
    if (!selectedDateId || !tournament) return
    
    try {
      setUpdatingDate(true)
      setDateError('')
      
      // Validate Tuesday requirement
      const dateValidation = validateTuesdayDate(newDateString)
      if (!dateValidation.valid) {
        setDateError(dateValidation.message || 'Fecha inválida')
        return
      }

      // Call API to update date
      const pin = typeof window !== 'undefined' ? localStorage.getItem('poker-pin') : null
      const response = await fetch(`/api/game-dates/${selectedDateId}`, {
        method: 'PUT',
        headers: {
          'Authorization': pin ? `Bearer PIN:${pin}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update',
          scheduledDate: newDateString
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update local state
        setSelectedDate(new Date(newDateString + 'T12:00:00'))
        
        // Update available dates list
        setAvailableDates(prev => prev.map(date => 
          date.id === selectedDateId 
            ? { ...date, scheduledDate: newDateString }
            : date
        ))
        
        // Clear any previous errors
        setError('')
      } else {
        const errorData = await response.json()
        setDateError(errorData.error || 'Error al actualizar fecha')
      }
    } catch (err) {
      console.error('Error updating date:', err)
      setDateError('Error al actualizar fecha')
    } finally {
      setUpdatingDate(false)
    }
  }

  const getDisplayName = (player: Player) => {
    const firstName = player.aliases && player.aliases.length > 0 
      ? player.aliases[0] 
      : player.firstName
    
    // Add last name initial
    const lastNameInitial = player.lastName ? player.lastName.charAt(0).toUpperCase() : ''
    return lastNameInitial ? `${firstName} ${lastNameInitial}.` : firstName
  }

  const currentPlayers = activeTab === 'enfermos' 
    ? [...registeredPlayers, ...additionalPlayers]
    : guests

  const selectedCount = activeTab === 'enfermos' 
    ? selectedPlayers.length 
    : selectedGuests.length

  if (!user || user.role !== UserRole.Comision) {
    return (
      <div className="min-h-screen bg-poker-dark flex items-center justify-center">
        <p className="text-poker-muted">Sin permisos para acceder</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-poker-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-poker-red" />
          <p className="text-poker-muted">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-poker-dark text-white">
      <div className="max-w-md mx-auto px-4 py-4">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Date Selection and Activation */}
          {!activeGameDate && (
            <div className="bg-poker-card rounded-lg border border-white/10 p-4">
              <div className="flex gap-2">
                {/* Date Dropdown - 50% width */}
                <select
                  value={selectedDateId || ''}
                  onChange={(e) => handleDateSelection(Number(e.target.value))}
                  className="w-1/2 p-3 bg-poker-dark text-white border border-white/20 rounded-lg text-lg font-bold"
                >
                  {availableDates.map((date) => (
                    <option key={date.id} value={date.id}>
                      Fecha {date.dateNumber}
                    </option>
                  ))}
                </select>

                {/* Activate Button - 50% width */}
                <Button
                  onClick={handleActivate}
                  disabled={activating || selectedPlayers.length === 0}
                  className="w-1/2 bg-poker-red hover:bg-red-700 text-white text-lg font-bold"
                >
                  {activating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Activando...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      ACTIVAR
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Player/Guest Toggle */}
          <div className="grid grid-cols-3 gap-2">
            {/* Enfermos Tab */}
            <button
              onClick={() => setActiveTab('enfermos')}
              className={`p-2 rounded-lg border-2 text-center transition-all ${
                activeTab === 'enfermos'
                  ? 'bg-poker-red border-poker-red text-white'
                  : 'bg-poker-card border-white/10 text-poker-text hover:border-white/20'
              }`}
            >
              <div className="text-xs">Enfermos</div>
              <div className="text-lg font-bold">{selectedPlayers.length}</div>
            </button>

            {/* Invitados Tab */}
            <button
              onClick={() => setActiveTab('invitados')}
              className={`p-2 rounded-lg border-2 text-center transition-all ${
                activeTab === 'invitados'
                  ? 'bg-pink-600 border-pink-600 text-white'
                  : 'bg-poker-card border-white/10 text-poker-text hover:border-white/20'
              }`}
            >
              <div className="text-xs">Invitados</div>
              <div className="text-lg font-bold">{selectedGuests.length}</div>
            </button>

            {/* Date Display */}
            <div className="p-2 bg-poker-card border border-white/10 rounded-lg text-center relative cursor-pointer hover:border-white/20 transition-all">
              {selectedDate && (
                <>
                  <div className="text-xs text-poker-muted">
                    {selectedDate.toLocaleDateString('es-ES', { month: 'long' })}
                  </div>
                  <div className="text-lg font-bold">
                    {selectedDate.getDate()}
                  </div>
                </>
              )}
              
              {/* Hidden DatePicker - invisible input for date selection */}
              <input
                type="date"
                value={selectedDate ? formatDateForInput(selectedDate) : ''}
                onChange={(e) => handleDateChange(e.target.value)}
                disabled={updatingDate || !selectedDateId}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                style={{ colorScheme: 'dark' }}
              />
              
              {/* Loading indicator */}
              {updatingDate && (
                <div className="absolute inset-0 flex items-center justify-center bg-poker-card/80 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-poker-red" />
                </div>
              )}
            </div>
          </div>

          {/* Player List */}
          <div className="bg-poker-card rounded-lg border border-white/10 p-4">
            <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
              {currentPlayers.map((player) => {
                const isSelected = activeTab === 'enfermos'
                  ? selectedPlayers.includes(player.id)
                  : selectedGuests.includes(player.id)
                
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    className={`p-3 rounded-lg border transition-all text-left ${
                      isSelected
                        ? activeTab === 'invitados' 
                          ? 'bg-black border-pink-600 text-white'
                          : 'bg-black border-poker-red text-white'
                        : 'bg-poker-dark/50 border-white/10 text-poker-text hover:border-white/20'
                    }`}
                  >
                    <div className="font-medium text-sm">
                      {getDisplayName(player)}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Create Guest Button (only in Invitados tab) */}
            {activeTab === 'invitados' && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <Button
                  onClick={handleCreateGuest}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  CREAR
                </Button>
              </div>
            )}
          </div>

          {/* Error Messages */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          {dateError && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-400" />
                <p className="text-red-400 text-sm">{dateError}</p>
              </div>
            </div>
          )}

          {/* Active Game Date Info */}
          {activeGameDate && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
              <h3 className="text-green-400 font-bold mb-2">Fecha Activa</h3>
              <p className="text-green-300 text-sm">
                {activeGameDate.tournament.name} - Fecha {activeGameDate.dateNumber}
              </p>
              <p className="text-green-300 text-sm">
                {activeGameDate.playersCount} participantes confirmados
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}