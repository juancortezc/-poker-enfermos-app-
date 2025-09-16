import useSWR from 'swr'

interface BlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
  duration: number
}

interface TimerData {
  id: string
  status: 'active' | 'paused' | 'stopped'
  currentLevel: number
  timeRemaining: number
  levelStartTime: string | null
  currentBlind?: BlindLevel
  nextBlind?: BlindLevel
  isActive: boolean
  canControl: boolean
  timerActions: Array<{
    id: string
    actionType: string
    performedAt: string
    performedBy: string
  }>
}

interface Tournament {
  id: number
  name: string
  number: number
  status: string
}

interface GameDate {
  id: number
  dateNumber: number
  status: string
  scheduledDate: string
  startTime: string | null
  playerIds: string[]
  playersCount: number
  tournament: Tournament
  isActive: boolean
  isConfigured: boolean
  canStart: boolean
  canEdit: boolean
}

interface AvailableDate {
  id: number
  dateNumber: number
  scheduledDate: string
  status: string
}

interface Visibility {
  showInRegistro: boolean
  showInTimer: boolean
  showInConfig: boolean
  showInAdmin: boolean
}

interface GameDateStatusResponse {
  success: boolean
  tournament: Tournament | null
  activeGameDate: GameDate | null
  timerData: TimerData | null
  availableDates: AvailableDate[]
  visibility: Visibility
  userRole: string
  timestamp: string
}

const fetcher = async (url: string): Promise<GameDateStatusResponse> => {
  const pin = typeof window !== 'undefined' ? localStorage.getItem('poker-pin') : null
  
  const response = await fetch(url, {
    headers: {
      'Authorization': pin ? `Bearer PIN:${pin}` : '',
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  return response.json()
}

export const useGameDateStatus = (refreshInterval: number = 30000) => {
  const { data, error, isLoading, mutate } = useSWR<GameDateStatusResponse>(
    '/api/game-dates/status',
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Prevent duplicate requests within 5 seconds
      errorRetryCount: 3,
      errorRetryInterval: 5000
    }
  )

  return {
    // Raw data
    data,
    error,
    isLoading,
    mutate,

    // Convenience accessors
    tournament: data?.tournament || null,
    activeGameDate: data?.activeGameDate || null,
    timerData: data?.timerData || null,
    availableDates: data?.availableDates || [],
    visibility: data?.visibility || {
      showInRegistro: false,
      showInTimer: false,
      showInConfig: false,
      showInAdmin: false
    },
    userRole: data?.userRole || '',

    // Status flags (backward compatibility)
    isActive: data?.activeGameDate?.isActive || false,
    hasActiveGameDate: data?.activeGameDate !== null,
    hasConfiguredGameDate: data?.activeGameDate?.isConfigured || false,
    hasTimerData: data?.timerData !== null,
    hasAvailableDates: (data?.availableDates?.length || 0) > 0,

    // Page visibility helpers
    showRegistrationButton: data?.visibility?.showInRegistro || false,
    showTimerPage: data?.visibility?.showInTimer || false,
    showConfigPage: data?.visibility?.showInConfig || false,
    showAdminFeatures: data?.visibility?.showInAdmin || false,

    // Helper functions
    canStartGameDate: () => data?.activeGameDate?.canStart || false,
    canEditGameDate: () => data?.activeGameDate?.canEdit || false,
    canControlTimer: () => data?.timerData?.canControl || false,
    
    // Refresh data manually
    refresh: () => mutate(),
    
    // Get formatted date string
    getFormattedDate: () => {
      if (!data?.activeGameDate?.scheduledDate) return null
      const date = new Date(data.activeGameDate.scheduledDate)
      return date.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    },

    // Get timer status text
    getTimerStatusText: () => {
      if (!data?.timerData) return 'Sin timer activo'
      if (data.timerData.status === 'active') return 'Timer activo'
      if (data.timerData.status === 'paused') return 'Timer pausado'
      return 'Timer detenido'
    }
  }
}

// Specialized hooks for specific use cases
export const useActiveGameDate = () => {
  const { activeGameDate, isActive, hasActiveGameDate, isLoading, error } = useGameDateStatus()
  return {
    activeDate: activeGameDate,
    isActive,
    hasActiveDate: hasActiveGameDate,
    isLoading,
    error
  }
}

export const useTimerStatus = () => {
  const { timerData, hasTimerData, canControlTimer, isLoading, error, mutate } = useGameDateStatus(5000) // Faster refresh for timer
  return {
    timerData,
    hasTimer: hasTimerData,
    canControl: canControlTimer(),
    isLoading,
    error,
    refresh: mutate
  }
}

export const useGameDateConfig = () => {
  const { availableDates, hasAvailableDates, showConfigPage, isLoading, error } = useGameDateStatus()
  return {
    availableDates,
    hasAvailable: hasAvailableDates,
    canConfigure: showConfigPage,
    isLoading,
    error
  }
}

export const useNavigation = () => {
  const { visibility, isLoading } = useGameDateStatus()
  return {
    showRegistrationButton: visibility.showInRegistro,
    showTimerPage: visibility.showInTimer,
    showConfigPage: visibility.showInConfig,
    showAdminFeatures: visibility.showInAdmin,
    isLoading
  }
}