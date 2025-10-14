interface TimerDisplayProps {
  timeRemaining: number
  formattedTime?: string
  status?: 'active' | 'paused' | 'inactive'
  currentBlind?: {
    smallBlind: number
    bigBlind: number
  }
}

export function TimerDisplay({
  timeRemaining,
  formattedTime,
  status = 'active',
  currentBlind
}: TimerDisplayProps) {
  // Usar formattedTime si se proporciona, sino calcular internamente
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const calculatedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  const timeDisplay = formattedTime || calculatedTime

  // Determinar si el tiempo es crítico (< 1 minuto)
  const isCritical = timeRemaining > 0 && timeRemaining < 60

  return (
    <div className={`bg-poker-red rounded-lg p-4 text-white shadow-lg transition-opacity duration-300 ${
      status === 'paused' ? 'opacity-70' : ''
    }`}>
      <div className="flex items-center justify-between">
        <div className={`text-xl md:text-2xl font-bold font-mono tracking-wider ${
          isCritical ? 'animate-pulse' : ''
        }`}>
          {status === 'paused' && '⏸ '}
          {timeDisplay}
        </div>
        <div className="text-sm md:text-base font-semibold">
          Blinds: {currentBlind ? `${currentBlind.smallBlind}/${currentBlind.bigBlind}` : 'Sin información'}
        </div>
      </div>
    </div>
  )
}