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
    <div className="bg-poker-red rounded-lg p-6 text-center text-white shadow-lg">
      <div className="text-4xl md:text-5xl font-bold mb-2 font-mono tracking-wider">
        {timeDisplay}
      </div>
      <div className="text-lg md:text-xl font-semibold">
        {currentBlind ? `${currentBlind.smallBlind}/${currentBlind.bigBlind}` : 'Sin información'}
      </div>
    </div>
  )
}