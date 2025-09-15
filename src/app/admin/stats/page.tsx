'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import ParentChildCard from '@/components/stats/ParentChildCard'
import { Card } from '@/components/ui/card'
import { Loader2, Users, Trophy } from 'lucide-react'

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

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('adminKey')}`,
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

  // Verificar acceso de Comisión
  useEffect(() => {
    if (user && user.role !== 'Comision') {
      router.push('/')
    }
  }, [user, router])

  // Obtener estadísticas del torneo activo
  const { data: statsData, error, isLoading } = useSWR<StatsResponse>(
    user?.role === 'Comision' ? '/api/stats/parent-child/1' : null,
    fetcher,
    {
      refreshInterval: 30000, // Actualizar cada 30 segundos
      revalidateOnFocus: true,
    }
  )

  if (user?.role !== 'Comision') {
    return null
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark">
      <div className="px-4 pt-20 pb-8">
        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Padres e Hijos Torneo {statsData?.tournament?.number}
          </h1>
        </div>

        {/* Estadísticas */}
        {relations.length > 0 ? (
          <div className="max-w-md mx-auto space-y-6">
            {relations.map((relation, index) => (
              <ParentChildCard
                key={relation.id}
                relation={relation}
                index={index}
              />
            ))}
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
        )}

        {/* Footer con contador */}
        {relations.length > 0 && (
          <div className="text-center mt-8">
            <p className="text-gray-400 text-sm">
              {relations.length} relación{relations.length !== 1 ? 'es' : ''} activa{relations.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}