'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Trophy, Users, Clock, Calendar } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()

  const quickActions = [
    {
      title: 'Timer Activo',
      description: 'Ver o controlar el timer del torneo',
      href: '/timer',
      icon: Clock,
      color: 'bg-blue-500',
    },
    {
      title: 'Rankings',
      description: 'Ver posiciones y estadísticas',
      href: '/rankings',
      icon: Trophy,
      color: 'bg-yellow-500',
    },
    {
      title: 'Jugadores',
      description: 'Gestionar jugadores del grupo',
      href: '/players',
      icon: Users,
      color: 'bg-green-500',
      adminOnly: true,
    },
    {
      title: 'Fechas',
      description: 'Administrar fechas de torneos',
      href: '/dates',
      icon: Calendar,
      color: 'bg-purple-500',
      adminOnly: true,
    },
  ]

  const filteredActions = quickActions.filter(action => 
    !action.adminOnly || user?.role === 'Comision'
  )

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Bienvenido, {user?.firstName}!
        </h2>
        <p className="text-gray-600">
          {user?.role === 'Comision' 
            ? 'Panel de administración del torneo'
            : 'Dashboard del jugador'
          }
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filteredActions.map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.href} href={action.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center mb-2`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-sm font-semibold">
                    {action.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-xs">
                    {action.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Torneo Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Estado:</span>
              <span className="text-sm font-medium text-green-600">Activo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Jugadores:</span>
              <span className="text-sm font-medium">23</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Próxima Fecha:</span>
              <span className="text-sm font-medium">Fecha 12</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {user?.role === 'Comision' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              Iniciar nueva fecha
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              Registrar eliminación
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              Ver estadísticas
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}