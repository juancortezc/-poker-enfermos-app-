'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import DaysWithoutVictoryTable from '@/components/stats/DaysWithoutVictoryTable'
import { Card } from '@/components/ui/card'
import { Loader2, Flame, CalendarX, Sparkles, Trophy } from 'lucide-react'
import { canAccess } from '@/lib/permissions'

type TabId = 'racha' | 'club1000'

interface Tournament {
  id: number
  number: number
  name: string
}

interface PlayerWithVictoryData {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
  lastVictoryDate?: string | null
  daysWithoutVictory: number
  hasNeverWon: boolean
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

export default function SinGanarPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('racha')

  const canSeeDaysWithoutVictory = user ? canAccess(user.role, 'stats-days') : false

  useEffect(() => {
    if (!loading && (!user || !canSeeDaysWithoutVictory)) {
      router.replace('/')
    }
  }, [user, loading, canSeeDaysWithoutVictory, router])

  const { data, error, isLoading } = useSWR<DaysWithoutVictoryResponse>(
    user && canSeeDaysWithoutVictory ? '/api/stats/days-without-victory/1' : null,
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
          <p className="text-white">Cargando racha sin victorias...</p>
        </div>
      </div>
    )
  }

  if (!user || !canSeeDaysWithoutVictory) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark flex items-center justify-center px-4">
        <Card className="admin-card p-6 text-center max-w-sm">
          <div className="flex flex-col items-center gap-4">
            <CalendarX className="w-10 h-10 text-red-400" />
            <p className="text-red-400">No se pudieron cargar los datos de los enfermos.</p>
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

  const players = data?.players ?? []
  const tournamentNumber = data?.tournament?.number ?? 28

  const milestonePlayers = players
    .filter(player => player.daysWithoutVictory >= 985 && player.daysWithoutVictory <= 1015)
    .sort((a, b) => b.daysWithoutVictory - a.daysWithoutVictory)

  const getDaysColorClass = (days: number) => {
    if (days <= 60) return 'text-green-400'
    if (days <= 250) return 'text-yellow-300'
    if (days <= 500) return 'text-orange-400'
    if (days <= 900) return 'text-pink-400'
    return 'text-red-400'
  }

  const renderClub1000Content = () => (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-[0_18px_55px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-poker-red to-poker-orange text-white shadow-[0_5px_25px_rgba(229,9,20,0.35)]">
        <Trophy className="h-10 w-10" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-white">Sección en construcción</h2>
      <p className="mt-2 text-sm text-white/70">
        Aquí encontrarás retos, logros y una tabla especial para los enfermos legendarios. Muy pronto estará disponible.
      </p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark pb-24 pt-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4">
        {/* Header with tabs */}
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/60">Estadísticas</p>
              <h1 className="mt-2 text-2xl font-bold text-white">Sin Ganar</h1>
              <p className="mt-1 text-sm text-white/70 max-w-md">
                Racha de días sin victorias y miembros del Club 1000
              </p>
            </div>
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full bg-poker-red/20">
              <Flame className="h-6 w-6 text-poker-red" />
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-3">
            <button
              onClick={() => setActiveTab('racha')}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all ${
                activeTab === 'racha'
                  ? 'border-poker-red/60 bg-gradient-to-r from-poker-red via-[#d73552] to-[#ff4b2b] text-white shadow-[0_12px_28px_rgba(215,53,82,0.45)]'
                  : 'border-white/12 bg-white/5 text-white/70 hover:text-white hover:border-white/35'
              }`}
            >
              <Flame className="h-4 w-4" />
              <span>Racha Actual</span>
            </button>
            <button
              onClick={() => setActiveTab('club1000')}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all ${
                activeTab === 'club1000'
                  ? 'border-poker-red/60 bg-gradient-to-r from-poker-red via-[#d73552] to-[#ff4b2b] text-white shadow-[0_12px_28px_rgba(215,53,82,0.45)]'
                  : 'border-white/12 bg-white/5 text-white/70 hover:text-white hover:border-white/35'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Club 1000</span>
            </button>
          </nav>
        </header>

        {/* Tab content */}
        {activeTab === 'racha' && (
          <>
            <Card className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_45px_rgba(229,9,20,0.12)] backdrop-blur-md">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-poker-red/20">
                  <Flame className="h-6 w-6 text-poker-red" />
                </div>
                <div className="flex-1">
                  {milestonePlayers.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {milestonePlayers.map(player => {
                        const delta = 1000 - player.daysWithoutVictory
                        const status = delta > 0
                          ? `Faltan ${delta} día${delta === 1 ? '' : 's'}`
                          : `+${Math.abs(delta)} día${Math.abs(delta) === 1 ? '' : 's'} sobre 1000`

                        return (
                          <div
                            key={player.id}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/80"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-white">
                                {player.firstName} {player.lastName}
                              </span>
                              <span className="text-xs text-white/60">{status}</span>
                            </div>
                            <span className={`text-base font-bold ${getDaysColorClass(player.daysWithoutVictory)}`}>
                              {player.daysWithoutVictory}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                      Sin jugadores próximos a cumplir 1000 días.
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <DaysWithoutVictoryTable players={players} tournamentNumber={tournamentNumber} />
          </>
        )}

        {activeTab === 'club1000' && renderClub1000Content()}
      </div>
    </div>
  )
}
