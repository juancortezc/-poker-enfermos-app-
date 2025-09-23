'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Trophy, Users, Clock, Calendar, Target, CheckCircle, FileSpreadsheet, Timer, CalendarDays, FileText, BarChart3 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useActiveGameDate } from '@/hooks/useGameDates'
import { useConfiguredOrActiveGameDate } from '@/hooks/useConfiguredOrActiveGameDate'

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()
  
  // Use SWR hooks for real-time data
  const { 
    tournament: activeTournament, 
    isLoading: tournamentLoading, 
    isError: tournamentError 
  } = useActiveTournament()
  
  const { 
    hasActiveDate, 
    isLoading: dateLoading, 
    isError: dateError 
  } = useActiveGameDate()

  // Simple state for button disable logic
  const [hasActiveOrCreatedDate, setHasActiveOrCreatedDate] = useState(false)
  const [activeDateInfo, setActiveDateInfo] = useState<{ id: number; dateNumber: number; status: string } | null>(null)
  const [isCheckingDates, setIsCheckingDates] = useState(true) // Start as checking to prevent premature clicks

  // Direct check for CREATED or in_progress dates
  const checkForActiveDates = async () => {
    try {
      console.log('🔄 Dashboard: Starting checkForActiveDates...')
      setIsCheckingDates(true)
      const response = await fetch('/api/game-dates/configured-or-active')
      
      console.log('📡 Dashboard: API Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📋 Dashboard: API Response data:', data)
        
        // More explicit null checking
        const hasActiveDate = data !== null && data !== undefined && 
                              (data.status === 'CREATED' || data.status === 'in_progress')
        
        console.log('🔍 Dashboard: Detailed check:', {
          dataIsNull: data === null,
          dataIsUndefined: data === undefined,
          dataStatus: data?.status,
          statusIsCREATED: data?.status === 'CREATED',
          statusIsInProgress: data?.status === 'in_progress',
          finalResult: hasActiveDate
        })
        
        console.log('🎯 Dashboard: Computed hasActiveDate:', hasActiveDate)
        
        setHasActiveOrCreatedDate(hasActiveDate)
        setActiveDateInfo(data)
        
        console.log('🔍 Dashboard Button Logic [' + new Date().toLocaleTimeString() + ']:', {
          hasActiveDate,
          dateStatus: data?.status,
          dateNumber: data?.dateNumber,
          shouldDisableButton: hasActiveDate,
          stateUpdate: { hasActiveOrCreatedDate: hasActiveDate, activeDateInfo: data }
        })
      } else {
        // No active dates found
        console.log('❌ Dashboard: API returned non-OK status:', response.status)
        setHasActiveOrCreatedDate(false)
        setActiveDateInfo(null)
        console.log('✅ No active dates found - button should be enabled')
      }
    } catch (error) {
      console.error('❌ Error checking dates:', error)
      setHasActiveOrCreatedDate(false)
    } finally {
      console.log('✅ Dashboard: checkForActiveDates completed, setting isCheckingDates to false')
      setIsCheckingDates(false)
    }
  }

  // Check on mount and periodically
  useEffect(() => {
    checkForActiveDates()
    const interval = setInterval(checkForActiveDates, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Manual refresh function
  const handleForceRefresh = () => {
    console.log('🔄 Manually refreshing date status')
    checkForActiveDates()
  }



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const quickActions = [
    {
      title: 'FECHA',
      href: '/game-dates/config',
      icon: Calendar,
      disabled: hasActiveOrCreatedDate || isCheckingDates, // Disable while checking OR when active date exists
      adminOnly: true, // Solo Comisión puede crear fechas
    },
    {
      title: 'TORNEOS',
      href: '/tournaments',
      icon: Trophy,
      adminOnly: true,
    },
    {
      title: 'ENFERMOS',
      href: '/players',
      icon: Users,
      adminOnly: true,
    },
    {
      title: 'IMPORTAR',
      href: '/admin/import',
      icon: FileSpreadsheet,
      adminOnly: true,
    },
  ]

  const filteredActions = quickActions.filter(action => 
    !action.adminOnly || user?.role === 'Comision'
  )

  return (
    <div className="px-4 pt-20">
      {/* Cards de acciones rápidas */}
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        {filteredActions.map((action, index) => {
          const Icon = action.icon
          const isDisabled = action.disabled
          
          // Debug log for FECHA button specifically
          if (action.title === 'FECHA') {
            console.log('🎯 FECHA Button Render:', {
              disabled: isDisabled,
              hasActiveOrCreatedDate,
              isCheckingDates,
              activeDateStatus: activeDateInfo?.status,
              activeDateNumber: activeDateInfo?.dateNumber,
              disabledReason: hasActiveOrCreatedDate ? 'Active date exists' : isCheckingDates ? 'Still checking' : 'Not disabled',
              timestamp: new Date().toLocaleTimeString(),
              rawButtonDisabled: action.disabled,
              computedDisabled: hasActiveOrCreatedDate || isCheckingDates
            })
          }
          
          const cardContent = (
            <Card className={`
              admin-card h-32
              ${isDisabled ? 'opacity-60' : 'cursor-pointer hover:scale-105'}
              animate-stagger animate-stagger-${index + 1}
              flex flex-col items-center justify-center p-4
              transition-all duration-300
            `}>
              <div className="flex-1 flex items-center justify-center">
                <div className={`
                  w-14 h-14 flex items-center justify-center rounded-xl
                  ${isDisabled ? 'bg-gray-700/50' : 'bg-poker-red'}
                  shadow-inner
                  ${isCheckingDates && !hasActiveOrCreatedDate ? 'animate-pulse' : ''}
                `}>
                  <Icon className={`w-7 h-7 ${isDisabled ? 'text-gray-500' : 'text-white drop-shadow-lg'}`} />
                </div>
              </div>
              <div className="text-center">
                <h3 className={`text-sm font-semibold tracking-wide ${isDisabled ? 'text-gray-500' : 'text-white'}`}>
                  {action.title}
                </h3>
                {action.title === 'FECHA' && isDisabled && (
                  <p className="text-xs text-gray-600 mt-1">
                    {isCheckingDates && !hasActiveOrCreatedDate ? 'Verificando...' : 'Fecha activa'}
                  </p>
                )}
              </div>
            </Card>
          )
          
          if (isDisabled) {
            return (
              <div key={action.href}>
                {cardContent}
              </div>
            )
          }
          
          return (
            <Link key={action.href} href={action.href}>
              {cardContent}
            </Link>
          )
        })}
      </div>

      {/* Próxima Fecha */}
      {activeTournament && activeTournament.stats?.nextDate && (
        <div className="mt-8 max-w-md mx-auto">
          {activeTournament.stats?.nextDate ? (
            <button
              onClick={() => router.push(`/game-dates/${activeTournament.stats.nextDate.id}/confirm`)}
              className="w-full btn-admin-primary"
            >
              <div className="flex items-center space-x-3 mb-2">
                <Target className="w-5 h-5 text-white" />
                <span className="text-lg font-semibold text-white">
                  FECHA {activeTournament.stats.nextDate.dateNumber}
                </span>
              </div>
              <p className="text-white text-center">
                {formatDate(activeTournament.stats.nextDate.scheduledDate)}
              </p>
            </button>
          ) : (
            <div className="p-4 bg-poker-card rounded-lg border-2 border-gray-600">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-5 h-5 text-white" />
                <span className="text-lg font-medium text-white">TODAS LAS FECHAS COMPLETADAS</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Debug section - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 max-w-md mx-auto p-4 bg-gray-800 rounded-lg border">
          <h3 className="text-white text-sm font-semibold mb-3">🔧 FECHA Button Debug</h3>
          
          <div className="space-y-2 mb-4">
            <div className="text-xs text-gray-300">
              <strong>hasActiveOrCreatedDate:</strong> <span className={hasActiveOrCreatedDate ? 'text-green-400' : 'text-red-400'}>{hasActiveOrCreatedDate.toString()}</span>
            </div>
            <div className="text-xs text-gray-300">
              <strong>Date Status:</strong> <span className="text-yellow-400">{activeDateInfo?.status || 'none'}</span>
            </div>
            <div className="text-xs text-gray-300">
              <strong>Date Number:</strong> <span className="text-blue-400">{activeDateInfo?.dateNumber || 'none'}</span>
            </div>
            <div className="text-xs text-gray-300">
              <strong>Players:</strong> <span className="text-purple-400">{activeDateInfo?.playersCount || 0}</span>
            </div>
            <div className="text-xs text-gray-300">
              <strong>Button Should Be:</strong> <span className={hasActiveOrCreatedDate || isCheckingDates ? 'text-red-400' : 'text-green-400'}>{hasActiveOrCreatedDate || isCheckingDates ? 'DISABLED (Gray)' : 'ENABLED (Red)'}</span>
            </div>
            <div className="text-xs text-gray-300">
              <strong>Checking:</strong> <span className={isCheckingDates ? 'text-yellow-400' : 'text-green-400'}>{isCheckingDates.toString()}</span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={handleForceRefresh}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
            >
              Force Refresh
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
            >
              Hard Reload
            </button>
          </div>
          
          <div className="mt-3 text-xs text-gray-400">
            <strong>Expected CSS when disabled:</strong><br/>
            • Card: opacity-60<br/>
            • Icon bg: bg-gray-700/50<br/>
            • Icon: text-gray-500<br/>
            • No hover effects
          </div>
        </div>
      )}

    </div>
  )
}