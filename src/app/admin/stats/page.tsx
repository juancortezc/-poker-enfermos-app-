'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import ParentChildCard from '@/components/stats/ParentChildCard'
import { Card } from '@/components/ui/card'
import { Loader2, Users, ShieldAlert } from 'lucide-react'
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

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error('Error fetching data')
  }

  return response.json()
}

export default function StatsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const canSeeRelations = user ? canAccess(user.role, 'stats-parents') : false

  useEffect(() => {
    if (!loading && (!user || !canSeeRelations)) {
      router.replace('/')
    }
  }, [user, loading, canSeeRelations, router])

  const { data, error, isLoading } = useSWR<StatsResponse>(
    user && canSeeRelations ? '/api/stats/parent-child/1' : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true
    }
  )

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-poker-red animate-spin" />
          <p className="text-white">Cargando estadísticas de padres e hijos...</p>
        </div>
      </div>
    )
  }

  if (!user || !canSeeRelations) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark flex items-center justify-center px-4">
        <Card className="admin-card p-6 text-center max-w-sm">
          <div className="flex flex-col items-center gap-4">
            <ShieldAlert className="w-10 h-10 text-red-400" />
            <p className="text-red-400">No se pudieron cargar las relaciones de padres e hijos.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-admin-primary"
            >
              Reintentar
            </button>
          </div>
        </Card>
      </div>
    )
  }

  const relations = data?.parentChildRelations ?? []
  const tournamentNumber = data?.tournament?.number ?? 28

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark pb-24 pt-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/60">Uso comisión</p>
              <h1 className="mt-2 text-2xl font-bold text-white">Stats · Padres e Hijos</h1>
              <p className="mt-1 text-sm text-white/70">
                Análisis de eliminaciones repetidas para el torneo #{tournamentNumber}.
              </p>
            </div>
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full bg-poker-red/20">
              <Users className="h-6 w-6 text-poker-red" />
            </div>
          </div>
        </header>

        {relations.length > 0 ? (
          <div className="space-y-4">
            {relations.map((relation, index) => (
              <ParentChildCard
                key={relation.id}
                relation={relation}
                index={index}
              />
            ))}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/70">
              {relations.length} relación{relations.length !== 1 ? 'es' : ''} activa{relations.length !== 1 ? 's' : ''} registradas.
            </div>
          </div>
        ) : (
          <Card className="admin-card p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-700/50">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Sin relaciones padre-hijo</h3>
              <p className="text-gray-400 text-sm">
                Ningún enfermo ha eliminado tres o más veces al mismo jugador en este torneo.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
