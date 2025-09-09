interface TimerDisplayProps {
  timeRemaining: number
  currentBlind?: {
    smallBlind: number
    bigBlind: number
  }
}

export function TimerDisplay({ timeRemaining, currentBlind }: TimerDisplayProps) {
  // Convertir segundos a MM:SS
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  return (
    <div className="bg-poker-red rounded-lg p-4 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div className="text-xl md:text-2xl font-bold font-mono tracking-wider">
          {timeDisplay}
        </div>
        <div className="text-sm md:text-base font-semibold">
          Blinds: {currentBlind ? `${currentBlind.smallBlind}/${currentBlind.bigBlind}` : 'Sin información'}
        </div>
      </div>
    </div>
  )
}