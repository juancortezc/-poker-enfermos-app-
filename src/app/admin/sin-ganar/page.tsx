'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import DaysWithoutVictoryTable from '@/components/stats/DaysWithoutVictoryTable'
import { Card } from '@/components/ui/card'
import { Loader2, Flame, CalendarX } from 'lucide-react'
import { canAccess } from '@/lib/permissions'

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark pb-24 pt-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4">
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
      </div>
    </div>
  )
}
