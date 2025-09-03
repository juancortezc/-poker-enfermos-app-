'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Trophy, Users, Clock, Calendar } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()

  const quickActions = [
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
      title: 'Timer Activo',
      description: 'Control de blinds',
      href: '/timer',
      icon: Clock,
      gradient: 'from-blue-500 to-blue-600',
      stats: 'Nivel 4',
    },
    {
      title: 'Fecha',
      description: 'Crear noche de juego',
      href: '/game-dates/new',
      icon: Calendar,
      gradient: 'from-yellow-500 to-yellow-600',
      stats: 'Próxima fecha',
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


    </div>
  )
}