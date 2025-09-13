import { formatTime } from '@/lib/timer-utils'

interface LiveTimerDisplayProps {
  currentBlind: {
    level: number
    smallBlind: number
    bigBlind: number
    duration: number
    timeRemaining: number
  } | null
  isActive: boolean
}

export function LiveTimerDisplay({ currentBlind, isActive }: LiveTimerDisplayProps) {
  if (!currentBlind) {
    return (
      <div className="bg-poker-card border border-poker-red/20 rounded-lg p-6 text-center">
        <div className="text-6xl font-bold text-poker-muted mb-2">--:--</div>
        <div className="text-poker-muted">Sin información de timer</div>
      </div>
    )
  }

  const { level, smallBlind, bigBlind, duration, timeRemaining } = currentBlind

  // Formatear tiempo restante
  const formattedTime = duration === 0 
    ? "SIN LÍMITE" 
    : formatTime(Math.floor(timeRemaining))

  return (
    <div className="bg-poker-card border border-poker-red/20 rounded-lg p-6 text-center">
      {/* Timer principal */}
      <div className="mb-4">
        <div className={`text-6xl font-bold mb-2 ${
          isActive && duration > 0 && timeRemaining <= 300 
            ? 'text-poker-red animate-pulse' 
            : 'text-white'
        }`}>
          {formattedTime}
        </div>
        {duration > 0 && (
          <div className="text-sm text-poker-muted">
            Duración: {duration} min
          </div>
        )}
      </div>

      {/* Información de blinds */}
      <div className="border-t border-white/10 pt-4">
        <div className="text-poker-muted text-sm mb-2">NIVEL {level}</div>
        <div className="text-white text-lg font-semibold">
          {smallBlind.toLocaleString()} / {bigBlind.toLocaleString()}
        </div>
        <div className="text-poker-muted text-xs mt-1">
          Small / Big Blind
        </div>
      </div>

      {/* Indicador de estado */}
      {isActive && (
        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/10">
          <span className="w-3 h-3 bg-poker-red rounded-full animate-pulse"></span>
          <span className="text-poker-red text-sm font-medium">EN VIVO</span>
        </div>
      )}
    </div>
  )
}