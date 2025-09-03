'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTimerSocket } from '@/hooks/useSocket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react'
import { canCRUD } from '@/lib/auth'

interface TimerDisplayProps {
  gameDateId?: number
}

interface BlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
  ante: number
  duration: number
}

export default function TimerDisplay({ gameDateId = 1 }: TimerDisplayProps) {
  const { user } = useAuth()
  const { isConnected, startTimer, pauseTimer, resumeTimer, levelUp } = useTimerSocket(gameDateId)
  const [timeRemaining, setTimeRemaining] = useState(1200) // 20 minutos por defecto
  const [currentLevel, setCurrentLevel] = useState(1)
  const [status, setStatus] = useState<'inactive' | 'active' | 'paused'>('inactive')

  const blindLevels = useMemo<BlindLevel[]>(() => [
    { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, duration: 20 },
    { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, duration: 20 },
    { level: 3, smallBlind: 75, bigBlind: 150, ante: 25, duration: 20 },
    { level: 4, smallBlind: 100, bigBlind: 200, ante: 25, duration: 20 },
    { level: 5, smallBlind: 150, bigBlind: 300, ante: 50, duration: 20 },
    { level: 6, smallBlind: 200, bigBlind: 400, ante: 50, duration: 20 },
    { level: 7, smallBlind: 300, bigBlind: 600, ante: 75, duration: 20 },
    { level: 8, smallBlind: 400, bigBlind: 800, ante: 100, duration: 20 },
  ], [])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (status === 'active' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Auto level up cuando el tiempo se acaba
            if (currentLevel < blindLevels.length) {
              setCurrentLevel(prev => prev + 1)
              return blindLevels[currentLevel]?.duration * 60 || 1200
            }
            setStatus('inactive')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [status, timeRemaining, currentLevel, blindLevels])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const currentBlindLevel = blindLevels[currentLevel - 1]
  const nextBlindLevel = blindLevels[currentLevel]
  const canControl = user && canCRUD(user.role)

  const handleStart = () => {
    setStatus('active')
    startTimer({ level: currentLevel, blinds: currentBlindLevel })
  }

  const handlePause = () => {
    setStatus('paused')
    pauseTimer()
  }

  const handleResume = () => {
    setStatus('active')
    resumeTimer()
  }

  const handleLevelUp = () => {
    if (currentLevel < blindLevels.length) {
      const newLevel = currentLevel + 1
      setCurrentLevel(newLevel)
      setTimeRemaining(blindLevels[newLevel - 1]?.duration * 60 || 1200)
      levelUp(currentLevel, newLevel)
    }
  }

  const handleReset = () => {
    setStatus('inactive')
    setCurrentLevel(1)
    setTimeRemaining(1200)
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Conexión: {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}</span>
        <span>Jugadores conectados: 12</span>
      </div>

      {/* Timer Display */}
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Nivel {currentLevel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Time Remaining */}
          <div className="text-6xl font-mono font-bold text-green-600">
            {formatTime(timeRemaining)}
          </div>

          {/* Blind Levels */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="p-2 bg-gray-50 rounded">
              <div className="font-semibold">Ciega Pequeña</div>
              <div className="text-lg">{currentBlindLevel?.smallBlind || 0}</div>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <div className="font-semibold">Ciega Grande</div>
              <div className="text-lg">{currentBlindLevel?.bigBlind || 0}</div>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <div className="font-semibold">Ante</div>
              <div className="text-lg">{currentBlindLevel?.ante || 0}</div>
            </div>
          </div>

          {/* Next Level Preview */}
          {nextBlindLevel && (
            <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
              <div className="font-semibold">Próximo Nivel {currentLevel + 1}</div>
              <div>{nextBlindLevel.smallBlind}/{nextBlindLevel.bigBlind} (Ante: {nextBlindLevel.ante})</div>
            </div>
          )}

          {/* Control Buttons - Only for Comision */}
          {canControl && (
            <div className="flex justify-center space-x-2 pt-4">
              {status === 'inactive' && (
                <Button onClick={handleStart} className="bg-green-600 hover:bg-green-700">
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar
                </Button>
              )}
              
              {status === 'active' && (
                <Button onClick={handlePause} variant="outline">
                  <Pause className="w-4 h-4 mr-2" />
                  Pausar
                </Button>
              )}
              
              {status === 'paused' && (
                <Button onClick={handleResume} className="bg-green-600 hover:bg-green-700">
                  <Play className="w-4 h-4 mr-2" />
                  Reanudar
                </Button>
              )}

              <Button onClick={handleLevelUp} variant="outline" disabled={currentLevel >= blindLevels.length}>
                <SkipForward className="w-4 h-4 mr-2" />
                Siguiente Nivel
              </Button>

              <Button onClick={handleReset} variant="outline" className="text-red-600">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}