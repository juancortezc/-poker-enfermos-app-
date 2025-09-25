'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { canCRUD } from '@/lib/auth'
import TimerDisplay from '@/components/TimerDisplay'
import { Clock } from 'lucide-react'

export default function TimerPage() {
  const { user } = useAuth()
  const { gameDate: activeGameDate, isLoading } = useActiveGameDate()

  // Verificar permisos
  if (!user || !canCRUD(user.role)) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="admin-card-error p-8 text-center max-w-md">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Acceso Restringido</h1>
          <p className="text-poker-muted">Solo usuarios de la Comisión pueden acceder al timer</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-[#E10600] to-[#ffa500] rounded-full flex items-center justify-center animate-pulse mb-4">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <p className="text-poker-muted">Cargando timer...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="max-w-md mx-auto pt-8">
        <TimerDisplay />
      </div>
    </div>
  )
}