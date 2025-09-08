'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Trophy, Users, Clock, Calendar, Target, CheckCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Dashboard() {
  const { user } = useAuth()
  const [activeTournament, setActiveTournament] = useState<any>(null)

  // Obtener torneo activo
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

    if (user) {
      fetchActiveTournament()
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
      title: 'Fecha',
      description: 'Crear noche de juego',
      href: '/game-dates/new',
      icon: Calendar,
      gradient: 'from-yellow-500 to-yellow-600',
      stats: 'Próxima fecha',
    },
    {
      title: 'Torneos',
      description: 'Gestión de torneos',
      href: '/tournaments',
      icon: Trophy,
      gradient: 'from-poker-red to-red-700',
      stats: 'Torneo 28',
      adminOnly: true,
    },
    {
      title: 'Enfermos',
      description: 'Gestión del grupo',
      href: '/players',
      icon: Users,
      gradient: 'from-poker-green to-green-600',
      stats: '29 activos',
      adminOnly: true,
    },
    {
      title: 'Timer Activo',
      description: 'Control de blinds',
      href: '/timer',
      icon: Clock,
      gradient: 'from-blue-500 to-blue-600',
      stats: 'Nivel 4',
    },
  ]

  const filteredActions = quickActions.filter(action => 
    !action.adminOnly || user?.role === 'Comision'
  )

  return (
    <div className="pt-16 px-4">
      {/* Cards de acciones rápidas */}
      <div className="grid grid-cols-2 gap-4">
        {filteredActions.map((action, index) => {
          const Icon = action.icon
          return (
            <Link key={action.href} href={action.href}>
              <Card className={`
                bg-poker-card border-white/10 hover:border-poker-red/50 
                transition-all duration-200 cursor-pointer h-full
                hover:shadow-xl hover:shadow-black/30 hover:-translate-y-1
                animate-stagger animate-stagger-${index + 1}
              `}>
                <CardHeader className="pb-3">
                  <div className={`
                    w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} 
                    flex items-center justify-center mb-3 shadow-lg
                  `}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-base font-bold text-poker-text">
                    {action.title}
                  </CardTitle>
                  <p className="text-xs text-poker-muted mt-1">
                    {action.description}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-poker-cyan font-semibold">
                      {action.stats}
                    </span>
                    <div className="w-2 h-2 bg-poker-cyan rounded-full animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Próxima Fecha */}
      {activeTournament && (
        <div className="mt-8 max-w-md mx-auto">
          <h2 className="text-lg font-bold text-white mb-4 text-center">Próxima Fecha</h2>
          {activeTournament.stats?.nextDate ? (
            <div className="p-4 bg-gradient-to-r from-poker-cyan/10 to-poker-red/10 rounded-lg border border-poker-cyan/20">
              <div className="flex items-center space-x-3 mb-2">
                <Target className="w-5 h-5 text-poker-cyan" />
                <span className="text-lg font-medium text-poker-cyan">
                  Fecha {activeTournament.stats.nextDate.dateNumber}
                </span>
              </div>
              <p className="text-white text-center">
                {formatDate(activeTournament.stats.nextDate.scheduledDate)}
              </p>
            </div>
          ) : (
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-lg font-medium text-green-400">Todas las fechas completadas</span>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}