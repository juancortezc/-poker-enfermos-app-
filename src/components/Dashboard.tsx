'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Trophy, Users, Clock, Calendar, Target, CheckCircle, FileSpreadsheet, Timer, CalendarDays, FileText, BarChart3 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useActiveGameDate } from '@/hooks/useGameDates'

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
      disabled: hasActiveDate,
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
    <div className="px-4 pt-32">
      {/* Cards de acciones rápidas */}
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        {filteredActions.map((action, index) => {
          const Icon = action.icon
          const isDisabled = action.disabled
          
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
                  ${isDisabled ? 'bg-gray-700/50' : 'bg-gradient-to-br from-white/10 to-white/5'}
                  shadow-inner
                `}>
                  <Icon className={`w-7 h-7 ${isDisabled ? 'text-gray-500' : 'text-white drop-shadow-lg'}`} />
                </div>
              </div>
              <div className="text-center">
                <h3 className={`text-sm font-semibold tracking-wide ${isDisabled ? 'text-gray-500' : 'text-white'}`}>
                  {action.title}
                </h3>
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
          <h2 className="text-lg font-bold text-white mb-4 text-center">PRÓXIMA FECHA</h2>
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

    </div>
  )
}