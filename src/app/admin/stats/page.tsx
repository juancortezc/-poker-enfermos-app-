'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import ParentChildCard from '@/components/stats/ParentChildCard'
import DaysWithoutVictoryTable from '@/components/stats/DaysWithoutVictoryTable'
import { Card } from '@/components/ui/card'
import { Loader2, Users, CalendarX, Lock } from 'lucide-react'
import { canAccess } from '@/lib/permissions'

interface Player {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
  role: string
}

interface ParentChildRelation {
  id: number
  eliminationCount: number
  firstElimination: string
  lastElimination: string
  parentPlayer: Player
  childPlayer: Player
}

interface Tournament {
  id: number
  number: number
  name: string
}

interface StatsResponse {
  tournament: Tournament
  parentChildRelations: ParentChildRelation[]
  totalRelations: number
}

interface PlayerWithVictoryData {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  lastVictoryDate?: string | null;
  daysWithoutVictory: number;
  hasNeverWon: boolean;
}

interface DaysWithoutVictoryResponse {
  tournament: Tournament
  players: PlayerWithVictoryData[]
  stats: {
    totalPlayers: number
    playersWithVictories: number
    playersNeverWon: number
    averageDaysWithoutVictory: number
    longestStreak: number
  }
}

type TabType = 'parent-child' | 'days-without-victory'

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  if (!response.ok) {
    throw new Error('Error fetching data')
  }
  
  return response.json()
}

export default function StatsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('parent-child')

  // Verificar acceso - permitir todos los roles pero con limitaciones
  useEffect(() => {
    if (user && !['Comision', 'Enfermo', 'Invitado'].includes(user.role)) {
      router.push('/')
    }
  }, [user, router])

  // Verificar acceso a tabs por rol
  const canAccessParentChild = user ? canAccess(user.role, 'stats-parents') : false
  const canAccessDaysWithoutVictory = user ? canAccess(user.role, 'stats-days') : false

  // Obtener estadísticas del torneo activo
  const { data: statsData, error: statsError, isLoading: statsLoading } = useSWR<StatsResponse>(
    canAccessParentChild ? '/api/stats/parent-child/1' : null,
    fetcher,
    {
      refreshInterval: 30000, // Actualizar cada 30 segundos
      revalidateOnFocus: true,
    }
  )

  // Obtener datos de días sin ganar
  const { data: daysData, error: daysError, isLoading: daysLoading } = useSWR<DaysWithoutVictoryResponse>(
    canAccessDaysWithoutVictory && activeTab === 'days-without-victory' ? '/api/stats/days-without-victory/1' : null,
    fetcher,
    {
      refreshInterval: 30000, // Actualizar cada 30 segundos
      revalidateOnFocus: true,
    }
  )

  // Permitir acceso pero redirigir si no puede acceder a ningún tab
  useEffect(() => {
    if (user && !canAccessParentChild && !canAccessDaysWithoutVictory) {
      router.push('/')
    }
  }, [user, canAccessParentChild, canAccessDaysWithoutVictory, router])

  // Cambiar tab por defecto si no puede acceder a parent-child
  useEffect(() => {
    if (user && !canAccessParentChild && canAccessDaysWithoutVictory && activeTab === 'parent-child') {
      setActiveTab('days-without-victory')
    }
  }, [user, canAccessParentChild, canAccessDaysWithoutVictory, activeTab])

  if (!user || (!canAccessParentChild && !canAccessDaysWithoutVictory)) {
    return null
  }

  const isLoading = activeTab === 'parent-child' ? statsLoading : daysLoading
  const error = activeTab === 'parent-child' ? statsError : daysError

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-poker-red animate-spin" />
          <p className="text-white">Cargando estadísticas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark flex items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-red-400 mb-4">Error al cargar estadísticas</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-admin-primary"
          >
            Reintentar
          </button>
        </Card>
      </div>
    )
  }

  const relations = statsData?.parentChildRelations || []
  const daysPlayers = daysData?.players || []
  const tournamentNumber = statsData?.tournament?.number || daysData?.tournament?.number || 28

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark">
      <div className="pt-4 pb-8">

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => canAccessParentChild && setActiveTab('parent-child')}
              disabled={!canAccessParentChild}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-all duration-200 relative
                ${!canAccessParentChild 
                  ? 'cursor-not-allowed opacity-50 text-gray-500'
                  : activeTab === 'parent-child' 
                    ? 'bg-poker-red text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }
              `}
              title={!canAccessParentChild ? 'Solo disponible para Comisión' : ''}
            >
              <Users className="w-4 h-4" />
              <span className="font-medium">Padres e Hijos</span>
              {!canAccessParentChild && (
                <Lock className="w-3 h-3 ml-1" />
              )}
            </button>
            <button
              onClick={() => canAccessDaysWithoutVictory && setActiveTab('days-without-victory')}
              disabled={!canAccessDaysWithoutVictory}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-all duration-200
                ${!canAccessDaysWithoutVictory 
                  ? 'cursor-not-allowed opacity-50 text-gray-500'
                  : activeTab === 'days-without-victory' 
                    ? 'bg-poker-red text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }
              `}
            >
              <CalendarX className="w-4 h-4" />
              <span className="font-medium">Días sin Ganar</span>
            </button>
          </div>
        </div>

        {/* Contenido de Tabs */}
        {activeTab === 'parent-child' ? (
          /* Tab Padres e Hijos */
          relations.length > 0 ? (
            <div className="space-y-4">
              {relations.map((relation, index) => (
                <ParentChildCard
                  key={relation.id}
                  relation={relation}
                  index={index}
                />
              ))}
              {/* Footer con contador */}
              <div className="text-center mt-8">
                <p className="text-gray-400 text-sm">
                  {relations.length} relación{relations.length !== 1 ? 'es' : ''} activa{relations.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <Card className="admin-card p-8 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    Sin Relaciones Padre-Hijo
                  </h3>
                  <p className="text-gray-400 text-center">
                    No hay jugadores con 3 o más eliminaciones sobre otro jugador en este torneo.
                  </p>
                </div>
              </Card>
            </div>
          )
        ) : (
          /* Tab Días sin Ganar */
          <DaysWithoutVictoryTable 
            players={daysPlayers}
            tournamentNumber={tournamentNumber}
          />
        )}
      </div>
    </div>
  )
}