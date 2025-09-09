'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Trophy, Users, Clock, Calendar, Target, CheckCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTournament, setActiveTournament] = useState<any>(null)
  const [hasActiveDate, setHasActiveDate] = useState(false)

  // Obtener torneo activo y fecha activa
  useEffect(() => {
    async function fetchActiveTournament() {
      try {
        if (!user?.adminKey) {
          return
        }

        const response = await fetch('/api/tournaments/active', {
          headers: {
            'Authorization': `Bearer ${user.adminKey}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.tournament) {
            setActiveTournament(data)
          }
        }
      } catch (error) {
        console.error('Error fetching active tournament:', error)
      }
    }

    async function checkActiveDate() {
      try {
        const response = await fetch('/api/game-dates/active')
        
        if (response.ok) {
          const data = await response.json()
          setHasActiveDate(!!data && !!data.id)
        }
      } catch (error) {
        console.error('Error checking active date:', error)
      }
    }

    if (user) {
      fetchActiveTournament()
      checkActiveDate()
    }
  }, [user])

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
      href: '/game-dates/new',
      icon: Calendar,
      disabled: hasActiveDate,
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
      title: 'TIMER ACTIVO',
      href: '/timer',
      icon: Clock,
    },
  ]

  const filteredActions = quickActions.filter(action => 
    !action.adminOnly || user?.role === 'Comision'
  )

  return (
    <div className="px-4 pt-32">
      {/* Cards de acciones rápidas */}
      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
        {filteredActions.map((action, index) => {
          const Icon = action.icon
          const isDisabled = action.disabled
          
          const cardContent = (
            <Card className={`
              bg-gradient-to-br from-poker-card to-gray-800 border-2 border-poker-red 
              transition-all duration-200 h-32
              ${isDisabled 
                ? 'opacity-50 cursor-not-allowed border-gray-600 shadow-inner' 
                : `cursor-pointer transform hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-100
                   shadow-lg shadow-black/40 hover:shadow-xl hover:shadow-poker-red/30
                   border-t-red-400 border-r-red-600 border-b-red-800 border-l-red-500`
              }
              animate-stagger animate-stagger-${index + 1}
              flex flex-col items-center justify-center p-4
              shadow-inner-light
            `}
            style={{
              boxShadow: isDisabled 
                ? 'inset 0 2px 4px rgba(0,0,0,0.3)' 
                : `0 4px 8px rgba(0,0,0,0.4), 
                   0 2px 4px rgba(0,0,0,0.3),
                   inset 0 1px 0 rgba(255,255,255,0.1),
                   inset 0 -1px 0 rgba(0,0,0,0.2)`
            }}>
              <div className="flex-1 flex items-center justify-center">
                <div className={`
                  w-12 h-12 rounded-lg flex items-center justify-center
                  ${isDisabled 
                    ? 'bg-gradient-to-br from-gray-600 to-gray-700 shadow-inner' 
                    : 'bg-gradient-to-br from-gray-700 to-gray-800 shadow-lg hover:shadow-xl hover:from-gray-600 hover:to-gray-700'
                  }
                  shadow-inner transition-all duration-200 transform hover:scale-105
                `}>
                  <Icon className={`w-6 h-6 ${isDisabled ? 'text-gray-400' : 'text-white'}`} />
                </div>
              </div>
              <div className="text-center">
                <h3 className={`text-sm font-bold ${isDisabled ? 'text-gray-500' : 'text-white'}`}>
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
              className="w-full p-4 bg-poker-card rounded-lg border-2 border-poker-red hover:border-red-400 transition-all hover:bg-poker-card/80"
            >
              <div className="flex items-center space-x-3 mb-2">
                <Target className="w-5 h-5 text-poker-red" />
                <span className="text-lg font-medium text-poker-red">
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