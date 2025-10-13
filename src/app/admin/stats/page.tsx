'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import ParentChildCard from '@/components/stats/ParentChildCard'
import AwardCard from '@/components/stats/AwardCard'
import EliminationsTab from '@/components/stats/EliminationsTab'
import { Card } from '@/components/ui/card'
import { Loader2, Users, ShieldAlert, Award, Target } from 'lucide-react'
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

interface AwardPlayer {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
}

interface AwardsResponse {
  tournament: Tournament
  awards: {
    varon: { player: AwardPlayer; eliminations: number }[]
    gay: { player: AwardPlayer; eliminations: number }[]
    podios: { player: AwardPlayer; count: number }[]
    sieteYDos: { player: AwardPlayer; count: number }[]
    sinPodio: AwardPlayer[]
    faltas: { player: AwardPlayer; count: number }[]
    mesasFinales: { player: AwardPlayer; count: number }[]
    victorias: { player: AwardPlayer; count: number }[]
  }
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

type TabType = 'ph' | 'premios' | 'eliminaciones'

export default function StatsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('ph')
  const [selectedTournamentId, setSelectedTournamentId] = useState(1) // Default to T28

  const canSeeRelations = user ? canAccess(user.role, 'stats-parents') : false

  useEffect(() => {
    if (!loading && (!user || !canSeeRelations)) {
      router.replace('/')
    }
  }, [user, loading, canSeeRelations, router])

  // Fetch P&H data
  const { data: phData, error: phError, isLoading: phLoading } = useSWR<StatsResponse>(
    user && canSeeRelations && activeTab === 'ph' ? `/api/stats/parent-child/${selectedTournamentId}` : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true
    }
  )

  // Fetch Awards data
  const { data: awardsData, error: awardsError, isLoading: awardsLoading } = useSWR<AwardsResponse>(
    user && canSeeRelations && activeTab === 'premios' ? `/api/stats/awards/${selectedTournamentId}` : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true
    }
  )

  // Fetch available tournaments (T28 onwards)
  const { data: tournaments } = useSWR<Tournament[]>(
    user && canSeeRelations ? '/api/tournaments' : null,
    fetcher
  )

  const availableTournaments = tournaments?.filter(t => t.number >= 28) || []

  if (loading || (activeTab === 'ph' && phLoading) || (activeTab === 'premios' && awardsLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-poker-red animate-spin" />
          <p className="text-white">Cargando estadísticas...</p>
        </div>
      </div>
    )
  }

  if (activeTab === 'eliminaciones') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark pb-24 pt-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4">
          {/* Header */}
          <header className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/60">Uso comisión</p>
                <h1 className="mt-2 text-2xl font-bold text-white">Stats · Torneo #{tournamentNumber}</h1>
                <p className="mt-1 text-sm text-white/70">
                  Control de eliminaciones por fecha.
                </p>
              </div>
              <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full bg-poker-red/20">
                <Target className="h-6 w-6 text-poker-red" />
              </div>
            </div>
          </header>

          {/* Tournament Selector */}
          {availableTournaments.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <label className="block text-xs uppercase tracking-[0.2em] text-white/60 mb-2">
                Seleccionar Torneo
              </label>
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(Number(e.target.value))}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white focus:border-poker-red/60 focus:outline-none focus:ring-2 focus:ring-poker-red/20"
              >
                {availableTournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id} className="bg-poker-dark">
                    Torneo {tournament.number} - {tournament.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tabs */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-1 flex gap-1">
            <button
              onClick={() => setActiveTab('ph')}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all text-white/60 hover:text-white/80 hover:bg-white/5"
            >
              P&H
            </button>
            <button
              onClick={() => setActiveTab('premios')}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all text-white/60 hover:text-white/80 hover:bg-white/5"
            >
              Premios
            </button>
            <button
              onClick={() => setActiveTab('eliminaciones')}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all bg-poker-red text-white shadow-lg"
            >
              Eliminaciones
            </button>
          </div>

          {/* Content */}
          <EliminationsTab tournamentId={selectedTournamentId} />
        </div>
      </div>
    )
  }

  if (!user || !canSeeRelations) {
    return null
  }

  const currentError = activeTab === 'ph' ? phError : awardsError

  if (currentError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark flex items-center justify-center px-4">
        <Card className="admin-card p-6 text-center max-w-sm">
          <div className="flex flex-col items-center gap-4">
            <ShieldAlert className="w-10 h-10 text-red-400" />
            <p className="text-red-400">No se pudieron cargar las estadísticas.</p>
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

  const relations = phData?.parentChildRelations ?? []
  const awards = awardsData?.awards
  const tournamentNumber = (activeTab === 'ph' ? phData?.tournament?.number : awardsData?.tournament?.number) ?? 28

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark pb-24 pt-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4">
        {/* Header */}
        <header className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/60">Uso comisión</p>
              <h1 className="mt-2 text-2xl font-bold text-white">Stats · Torneo #{tournamentNumber}</h1>
              <p className="mt-1 text-sm text-white/70">
                Análisis detallado de estadísticas del torneo.
              </p>
            </div>
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full bg-poker-red/20">
              {activeTab === 'ph' ? (
                <Users className="h-6 w-6 text-poker-red" />
              ) : (
                <Award className="h-6 w-6 text-poker-red" />
              )}
            </div>
          </div>
        </header>

        {/* Tournament Selector */}
        {availableTournaments.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="block text-xs uppercase tracking-[0.2em] text-white/60 mb-2">
              Seleccionar Torneo
            </label>
            <select
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(Number(e.target.value))}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white focus:border-poker-red/60 focus:outline-none focus:ring-2 focus:ring-poker-red/20"
            >
              {availableTournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id} className="bg-poker-dark">
                  Torneo {tournament.number} - {tournament.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-1 flex gap-1">
          <button
            onClick={() => setActiveTab('ph')}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === 'ph'
                ? 'bg-poker-red text-white shadow-lg'
                : 'text-white/60 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            P&H
          </button>
          <button
            onClick={() => setActiveTab('premios')}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === 'premios'
                ? 'bg-poker-red text-white shadow-lg'
                : 'text-white/60 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            Premios
          </button>
          <button
            onClick={() => setActiveTab('eliminaciones')}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === 'eliminaciones'
                ? 'bg-poker-red text-white shadow-lg'
                : 'text-white/60 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            Eliminaciones
          </button>
        </div>

        {/* Content */}
        {activeTab === 'ph' ? (
          // P&H Tab Content
          relations.length > 0 ? (
            <div className="space-y-4">
              {relations.map((relation, index) => (
                <ParentChildCard
                  key={relation.id}
                  relation={relation}
                  index={index}
                  tournamentId={selectedTournamentId}
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
          )
        ) : (
          // Premios Tab Content
          awards && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Varón del Torneo */}
              <AwardCard
                title="Varón del Torneo"
                description="Mayor cantidad de eliminaciones"
                icon="trophy"
                accentColor="red"
                players={awards.varon.map(v => ({ player: v.player, value: v.eliminations }))}
                valueLabel="Elims"
              />

              {/* Gay del Torneo */}
              <AwardCard
                title="Gay del Torneo"
                description="Menor cantidad de eliminaciones"
                icon="userx"
                accentColor="purple"
                players={awards.gay.map(g => ({ player: g.player, value: g.eliminations }))}
                valueLabel="Elims"
              />

              {/* Podios */}
              <AwardCard
                title="Podios"
                description="Mayor cantidad de Top 3"
                icon="medal"
                accentColor="amber"
                players={awards.podios.slice(0, 5).map(p => ({ player: p.player, value: p.count }))}
                valueLabel="Podios"
              />

              {/* Últimos */}
              <AwardCard
                title="Últimos"
                description="Últimas dos posiciones"
                icon="target"
                accentColor="rose"
                players={awards.sieteYDos.slice(0, 5).map(s => ({ player: s.player, value: s.count }))}
                valueLabel="Veces"
              />

              {/* Sin Podio */}
              <AwardCard
                title="Sin Podio"
                description="Nunca en el Top 3"
                icon="calendar"
                accentColor="blue"
                players={awards.sinPodio.map(p => ({ player: p }))}
              />

              {/* Faltas */}
              <AwardCard
                title="Faltas"
                description="Mayor cantidad de ausencias"
                icon="userx"
                accentColor="rose"
                players={awards.faltas.slice(0, 5).map(f => ({ player: f.player, value: f.count }))}
                valueLabel="Faltas"
              />

              {/* Mesas Finales */}
              <AwardCard
                title="Mesas Finales"
                description="Mayor cantidad en Top 9"
                icon="users"
                accentColor="emerald"
                players={awards.mesasFinales.slice(0, 5).map(m => ({ player: m.player, value: m.count }))}
                valueLabel="Veces"
              />

              {/* Victorias */}
              <AwardCard
                title="Victorias"
                description="Mayor cantidad de 1er lugar"
                icon="crown"
                accentColor="amber"
                players={awards.victorias.slice(0, 5).map(v => ({ player: v.player, value: v.count }))}
                valueLabel="Victorias"
              />
            </div>
          )
        )}
      </div>
    </div>
  )
}
