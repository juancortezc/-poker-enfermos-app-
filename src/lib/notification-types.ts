export type NotificationCategory = 'timer' | 'game'

export interface NotificationPreferences {
  timer: {
    oneMinuteWarning: boolean
    blindChange: boolean
    timerPaused: boolean
  }
  game: {
    playerEliminated: boolean
    winnerDeclared: boolean
    gameCompleted: boolean
  }
  sound: {
    enabled: boolean
    volume: number // 0-100
  }
  vibration: {
    enabled: boolean
    intensity: 'light' | 'medium' | 'heavy'
  }
}

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  tag?: string
  priority?: 'low' | 'normal' | 'high'
  sound?: string
  vibrate?: boolean
  data?: Record<string, unknown>
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  timer: {
    oneMinuteWarning: true,
    blindChange: true,
    timerPaused: false,
  },
  game: {
    playerEliminated: true,
    winnerDeclared: true,
    gameCompleted: true,
  },
  sound: {
    enabled: true,
    volume: 70,
  },
  vibration: {
    enabled: true,
    intensity: 'medium',
  },
}

export type NotificationPreferenceType = keyof NotificationPreferences['timer'] | keyof NotificationPreferences['game']
