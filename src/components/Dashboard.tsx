'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Trophy, Users, Clock, Calendar, TrendingUp, Activity, DollarSign, BarChart3 } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const { user } = useAuth()
  const [liveStats, setLiveStats] = useState({
    activePlayers: 23,
    pot: 2300,
    currentBlind: '50/100',
    timeElapsed: '01:24:35'
  })

  // Simulación de actualización en vivo cada 3 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        ...prev,
        pot: prev.pot + Math.floor(Math.random() * 100),
        timeElapsed: new Date().toLocaleTimeString()
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

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
      title: 'Rankings',
      description: 'Tabla de posiciones',
      href: '/rankings',
      icon: TrendingUp,
      gradient: 'from-yellow-500 to-yellow-600',
      stats: 'Top 10',
    },
    {
      title: 'Jugadores',
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
    <div className="space-y-6">
      {/* Header con saludo */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-poker-text mb-2 animate-enter">
          ¡Bienvenido, {user?.firstName}!
        </h2>
        <p className="text-poker-muted animate-enter animate-stagger-1">
          {user?.role === 'Comision' 
            ? 'Panel de administración del torneo'
            : 'Dashboard del jugador'
          }
        </p>
      </div>

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

      {/* Stats en vivo */}
      <Card className="bg-poker-card border-poker-cyan/20 relative overflow-hidden animate-enter animate-stagger-3">
        <div className="absolute top-0 right-0 p-4">
          <div className="relative">
            <div className="w-3 h-3 bg-poker-cyan rounded-full animate-ping absolute"></div>
            <div className="w-3 h-3 bg-poker-cyan rounded-full"></div>
          </div>
        </div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-poker-text">
            <Activity className="w-5 h-5 text-poker-cyan" />
            Estado del Torneo en Vivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-poker-muted mb-1">Jugadores Activos</p>
                <p className="text-2xl font-bold text-poker-text animate-live-pulse">
                  {liveStats.activePlayers}
                </p>
              </div>
              <div>
                <p className="text-xs text-poker-muted mb-1">Blinds Actuales</p>
                <p className="text-lg font-semibold text-poker-cyan">
                  {liveStats.currentBlind}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-poker-muted mb-1">Pozo Total</p>
                <p className="text-2xl font-bold text-poker-green animate-live-pulse">
                  ${liveStats.pot}
                </p>
              </div>
              <div>
                <p className="text-xs text-poker-muted mb-1">Tiempo</p>
                <p className="text-lg font-mono text-poker-text">
                  {liveStats.timeElapsed}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones rápidas solo para Comision */}
      {user?.role === 'Comision' && (
        <Card className="bg-poker-red/10 border-poker-red/30 animate-enter animate-stagger-4">
          <CardHeader>
            <CardTitle className="text-poker-red flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Centro de Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start bg-poker-dark hover:bg-poker-red hover:text-white border-poker-red/30 text-poker-text transition-smooth"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Iniciar nueva fecha
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start bg-poker-dark hover:bg-poker-red hover:text-white border-poker-red/30 text-poker-text transition-smooth"
            >
              <Activity className="w-4 h-4 mr-2" />
              Registrar eliminación
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start bg-poker-dark hover:bg-poker-red hover:text-white border-poker-red/30 text-poker-text transition-smooth"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Gestionar buy-ins
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}