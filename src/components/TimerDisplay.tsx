'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTimerSocket } from '@/hooks/useSocket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Pause, SkipForward, RotateCcw, Users, Activity } from 'lucide-react'
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

  const progress = ((blindLevels[currentLevel - 1]?.duration * 60 - timeRemaining) / (blindLevels[currentLevel - 1]?.duration * 60)) * 100

  return (
    <div className="space-y-6 animate-enter">
      {/* Connection Status */}
      <div className="flex items-center justify-between text-xs text-poker-muted bg-poker-card rounded-lg p-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-poker-cyan' : 'bg-red-500'}`}></div>
            {isConnected && <div className="absolute inset-0 w-2 h-2 bg-poker-cyan rounded-full animate-ping"></div>}
          </div>
          <span>{isConnected ? 'Conectado' : 'Desconectado'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={14} />
          <span className="font-semibold text-poker-cyan">12 en vivo</span>
        </div>
      </div>

      {/* Timer Display Principal */}
      <Card className="bg-poker-card border-poker-red/20 overflow-hidden animate-stagger animate-stagger-1">
        <CardHeader className="bg-gradient-to-r from-poker-red to-red-700 text-white pb-3">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-black">{currentLevel}</span>
            </div>
            <span>Nivel {currentLevel}</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-6">
          {/* Time Display con efecto */}
          <div className="relative">
            {/* Progress ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-poker-dark/50"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 88}`}
                  strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                  className="text-poker-red transition-all duration-1000 ease-linear"
                />
              </svg>
            </div>
            
            {/* Timer */}
            <div className="relative z-10 flex items-center justify-center h-48">
              <div className={`text-7xl font-mono font-black ${
                timeRemaining < 60 ? 'text-poker-red animate-pulse' : 'text-poker-cyan'
              }`}>
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>

          {/* Blind Levels con nuevo estilo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-poker-dark/50 rounded-xl p-4 text-center border border-white/10">
              <div className="text-xs text-poker-muted mb-1">Small Blind</div>
              <div className="text-2xl font-bold text-poker-text">${currentBlindLevel?.smallBlind || 0}</div>
            </div>
            <div className="bg-poker-dark/50 rounded-xl p-4 text-center border border-white/10">
              <div className="text-xs text-poker-muted mb-1">Big Blind</div>
              <div className="text-2xl font-bold text-poker-text">${currentBlindLevel?.bigBlind || 0}</div>
            </div>
            <div className="bg-poker-dark/50 rounded-xl p-4 text-center border border-white/10">
              <div className="text-xs text-poker-muted mb-1">Ante</div>
              <div className="text-2xl font-bold text-poker-text">${currentBlindLevel?.ante || 0}</div>
            </div>
          </div>

          {/* Next Level Preview con animación */}
          {nextBlindLevel && (
            <div className="bg-gradient-to-r from-poker-cyan/10 to-transparent border-l-4 border-poker-cyan p-4 rounded-r-lg animate-live-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-poker-muted font-semibold">PRÓXIMO: NIVEL {currentLevel + 1}</div>
                  <div className="text-lg text-poker-cyan font-bold mt-1">
                    ${nextBlindLevel.smallBlind}/${nextBlindLevel.bigBlind} 
                    {nextBlindLevel.ante > 0 && <span className="text-sm text-poker-muted ml-2">Ante: ${nextBlindLevel.ante}</span>}
                  </div>
                </div>
                <SkipForward className="w-8 h-8 text-poker-cyan/50" />
              </div>
            </div>
          )}

          {/* Control Buttons con nuevo diseño */}
          {canControl && (
            <div className="grid grid-cols-2 gap-3 pt-4">
              {status === 'inactive' && (
                <Button 
                  onClick={handleStart} 
                  className="col-span-2 h-14 bg-gradient-to-r from-poker-green to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg shadow-lg transition-smooth"
                >
                  <Play className="w-5 h-5 mr-2" />
                  INICIAR TIMER
                </Button>
              )}
              
              {status === 'active' && (
                <>
                  <Button 
                    onClick={handlePause} 
                    className="h-14 bg-poker-dark hover:bg-poker-red hover:text-white border-poker-red/50 text-poker-text font-bold transition-smooth"
                  >
                    <Pause className="w-5 h-5 mr-2" />
                    PAUSAR
                  </Button>
                  <Button 
                    onClick={handleLevelUp} 
                    disabled={currentLevel >= blindLevels.length}
                    className="h-14 bg-poker-cyan/20 hover:bg-poker-cyan hover:text-poker-dark border-poker-cyan/50 text-poker-cyan font-bold transition-smooth disabled:opacity-50"
                  >
                    <SkipForward className="w-5 h-5 mr-2" />
                    NIVEL UP
                  </Button>
                </>
              )}
              
              {status === 'paused' && (
                <>
                  <Button 
                    onClick={handleResume} 
                    className="h-14 bg-gradient-to-r from-poker-green to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold shadow-lg transition-smooth"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    REANUDAR
                  </Button>
                  <Button 
                    onClick={handleLevelUp} 
                    disabled={currentLevel >= blindLevels.length}
                    className="h-14 bg-poker-cyan/20 hover:bg-poker-cyan hover:text-poker-dark border-poker-cyan/50 text-poker-cyan font-bold transition-smooth disabled:opacity-50"
                  >
                    <SkipForward className="w-5 h-5 mr-2" />
                    NIVEL UP
                  </Button>
                </>
              )}

              <Button 
                onClick={handleReset} 
                variant="outline" 
                className="col-span-2 h-12 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50 transition-smooth"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reiniciar Timer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estado del timer para usuarios no admin */}
      {!canControl && status === 'active' && (
        <div className="bg-poker-cyan/10 border border-poker-cyan/30 rounded-lg p-4 text-center animate-enter animate-stagger-2">
          <p className="text-poker-cyan font-semibold flex items-center justify-center gap-2">
            <Activity className="w-5 h-5 animate-pulse" />
            Timer en progreso - Solo visualización
          </p>
        </div>
      )}
    </div>
  )
}